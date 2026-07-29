"""
폴더 아카이브 -> Supabase 임포트 스크립트
================================================================

archive_excel_generator.py와 동일한 폴더 규칙(루트/연도/대분류/중분류/출처/비고/파일)을
그대로 재사용해서, 같은 (연도,대분류,중분류,출처,비고) 폴더 조합에 속한 파일들을
하나의 게시물(post)로 묶어 Supabase에 upsert하고, 이미지 파일은 Next.js 레포의
정적 폴더로 복사한다.

여러 번 실행해도 안전하다(idempotent): 게시물은 폴더 경로(import_key)로,
이미지는 복사 경로(image_path)로 upsert된다.

사전 준비:
    1. supabase/migrations/ 를 프로젝트에 적용해서 categories/tag_groups/tags 시드까지 끝낸 상태여야 함
    2. pip install -r scripts/requirements.txt
    3. 환경변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 설정
       (SERVICE_ROLE 키는 RLS를 우회하므로 절대 프론트/브라우저에 노출하지 말 것)

사용법:
    python scripts/import_to_supabase.py \
        --root "정리한 폴더 경로" \
        --images-dest "../bws-web/public/images" \
        --dry-run   # 먼저 계획만 확인, 이상 없으면 --dry-run 빼고 재실행
"""

import argparse
import os
import shutil
import sys
from collections import defaultdict
from pathlib import Path

from archive_excel_generator import FIELD_ORDER, collect_files, parse_folder_fields

# 폴더의 '대분류' 값 -> categories.slug 매핑.
# 폴더명이 정확히 이 키와 일치해야 매핑된다 (예: '작품', '앰버서더', '기타활동').
CATEGORY_FOLDER_MAP = {
    "작품": "work",
    "앰버서더": "ambassador",
    "기타활동": "other",
}


def build_import_key(fields: dict) -> str:
    return "/".join(fields[k] for k in FIELD_ORDER)


def build_repo_relative_path(fields: dict, filename: str) -> str:
    # 'N/A'인 단계는 실제 폴더가 없었던 것이므로 복사 경로에서 제외
    parts = [fields[k] for k in FIELD_ORDER if fields[k] != "N/A"]
    parts.append(filename)
    return "/".join(parts)


def group_files(files):
    groups = defaultdict(list)
    for fpath, rel_parts in files:
        fields = parse_folder_fields(rel_parts)
        key = tuple(fields[k] for k in FIELD_ORDER)
        groups[key].append(fpath)
    return groups


def plan_import(root: Path):
    files = collect_files(root)
    groups = group_files(files)

    plan = []
    unmapped = defaultdict(int)
    for key, fpaths in groups.items():
        fields = dict(zip(FIELD_ORDER, key))
        cat_slug = CATEGORY_FOLDER_MAP.get(fields["대분류"])
        if not cat_slug:
            unmapped[fields["대분류"]] += len(fpaths)
            continue
        plan.append((fields, cat_slug, fpaths))
    return files, plan, unmapped


def post_title(fields: dict) -> str:
    if fields["중분류"] != "N/A":
        return fields["중분류"]
    if fields["비고"] != "N/A":
        return fields["비고"]
    return fields["대분류"]


def get_or_create_category(sb, cache, slug):
    if slug not in cache:
        res = sb.table("categories").select("id").eq("slug", slug).limit(1).execute()
        if not res.data:
            raise RuntimeError(f"카테고리 '{slug}'가 DB에 없습니다. 먼저 마이그레이션/시드를 적용하세요.")
        cache[slug] = res.data[0]["id"]
    return cache[slug]


def get_tag_group(sb, cache, slug):
    if slug not in cache:
        res = sb.table("tag_groups").select("id").eq("slug", slug).limit(1).execute()
        if not res.data:
            raise RuntimeError(f"tag_group '{slug}'가 DB에 없습니다. 먼저 마이그레이션/시드를 적용하세요.")
        cache[slug] = res.data[0]["id"]
    return cache[slug]


def upsert_tag(sb, group_id: str, category_id, name: str) -> str:
    """이름으로 조회(카테고리 종속 여부 포함). 없으면 slug=name으로 새로 만든다."""
    q = sb.table("tags").select("id").eq("group_id", group_id).eq("name", name)
    q = q.is_("category_id", "null") if category_id is None else q.eq("category_id", category_id)
    res = q.limit(1).execute()
    if res.data:
        return res.data[0]["id"]
    ins = sb.table("tags").insert(
        {"group_id": group_id, "category_id": category_id, "name": name, "slug": name}
    ).execute()
    return ins.data[0]["id"]


def upsert_post(sb, category_id: str, import_key: str, title: str):
    res = sb.table("posts").select("id").eq("import_key", import_key).limit(1).execute()
    if res.data:
        return res.data[0]["id"], False
    ins = sb.table("posts").insert(
        {"category_id": category_id, "title": title, "import_key": import_key}
    ).execute()
    return ins.data[0]["id"], True


def link_tag(sb, post_id: str, tag_id: str):
    sb.table("post_tags").upsert(
        {"post_id": post_id, "tag_id": tag_id}, on_conflict="post_id,tag_id"
    ).execute()


def upsert_post_image(sb, post_id: str, image_path: str, sort_order: int):
    sb.table("post_images").upsert(
        {"post_id": post_id, "image_path": image_path, "sort_order": sort_order},
        on_conflict="image_path",
    ).execute()


def run_dry_run(plan, unmapped):
    for fields, cat_slug, fpaths in plan:
        print(
            f"[dry-run] post: {build_import_key(fields)} "
            f"(category={cat_slug}, title='{post_title(fields)}', images={len(fpaths)})"
        )
    if unmapped:
        print("\n대분류 매핑이 없어 건너뛴 그룹 (CATEGORY_FOLDER_MAP 확인 필요):")
        for name, cnt in unmapped.items():
            print(f"  - '{name}': {cnt}개 파일")


def run_import(sb, plan, images_dest: Path):
    category_cache = {}
    group_cache = {}
    created_posts = updated_posts = copied_images = 0

    for fields, cat_slug, fpaths in plan:
        category_id = get_or_create_category(sb, category_cache, cat_slug)

        import_key = build_import_key(fields)
        post_id, created = upsert_post(sb, category_id, import_key, post_title(fields))
        created_posts += int(created)
        updated_posts += int(not created)

        year_group = get_tag_group(sb, group_cache, "year")
        link_tag(sb, post_id, upsert_tag(sb, year_group, None, fields["연도"]))

        if fields["중분류"] != "N/A":
            sub_group = get_tag_group(sb, group_cache, "subcategory")
            link_tag(sb, post_id, upsert_tag(sb, sub_group, category_id, fields["중분류"]))

        if fields["출처"] != "N/A":
            source_group = get_tag_group(sb, group_cache, "source")
            link_tag(sb, post_id, upsert_tag(sb, source_group, None, fields["출처"]))

        if fields["비고"] != "N/A":
            note_group = get_tag_group(sb, group_cache, "note")
            link_tag(sb, post_id, upsert_tag(sb, note_group, None, fields["비고"]))

        fpaths_sorted = sorted(fpaths, key=lambda p: p.name.lower())
        cover_path = None
        for i, fpath in enumerate(fpaths_sorted):
            rel_path = build_repo_relative_path(fields, fpath.name)
            dest_path = images_dest / rel_path
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(fpath, dest_path)
            copied_images += 1
            upsert_post_image(sb, post_id, rel_path, i)
            if cover_path is None:
                cover_path = rel_path

        if cover_path:
            sb.table("posts").update({"cover_image_path": cover_path}).eq("id", post_id).execute()

    print(f"완료: post {created_posts}개 생성 / {updated_posts}개 갱신, 이미지 {copied_images}개 복사")


def main():
    parser = argparse.ArgumentParser(description="폴더 아카이브를 Supabase로 임포트")
    parser.add_argument("--root", required=True, help="정리한 최상위 루트 폴더 경로")
    parser.add_argument(
        "--images-dest", required=True, help="이미지를 복사할 Next.js 레포 내 폴더 (예: ../web/public/images)"
    )
    parser.add_argument("--dry-run", action="store_true", help="DB/파일 변경 없이 실행 계획만 출력")
    args = parser.parse_args()

    root = Path(args.root).expanduser().resolve()
    if not root.exists() or not root.is_dir():
        print(f"오류: '{root}' 폴더를 찾을 수 없습니다.")
        sys.exit(1)

    files, plan, unmapped = plan_import(root)
    if not files:
        print(f"'{root}' 아래에서 사진/영상 파일을 찾지 못했습니다.")
        return

    print(f"총 {len(files)}개 파일, {len(plan) + len(unmapped)}개 그룹(게시물 후보) 중 {len(plan)}개 처리 예정")

    if args.dry_run:
        run_dry_run(plan, unmapped)
        return

    if unmapped:
        print("대분류 매핑이 없어 건너뛴 그룹 (CATEGORY_FOLDER_MAP 확인 필요):")
        for name, cnt in unmapped.items():
            print(f"  - '{name}': {cnt}개 파일")

    try:
        from supabase import create_client
    except ImportError:
        print("supabase 패키지가 없습니다: pip install -r scripts/requirements.txt")
        sys.exit(1)

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        print("환경변수 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.")
        sys.exit(1)

    images_dest = Path(args.images_dest).expanduser().resolve()
    images_dest.mkdir(parents=True, exist_ok=True)

    sb = create_client(supabase_url, supabase_key)
    run_import(sb, plan, images_dest)


if __name__ == "__main__":
    main()
