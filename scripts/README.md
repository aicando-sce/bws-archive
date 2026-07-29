# scripts/

## 1. `archive_excel_generator.py` (기존)

폴더(`루트/연도/대분류/중분류/출처/비고/파일`)를 훑어서 연도별 시트로 나뉜 엑셀 대장을
만든다. 사람이 눈으로 확인/검수하는 용도.

```bash
python archive_excel_generator.py --root "정리한 폴더 경로" --output "아카이브_대장.xlsx"
```

## 2. `import_to_supabase.py` (신규)

같은 폴더 규칙을 그대로 재사용해서 Supabase(`posts`/`tags`/`post_tags`/`post_images`)에
데이터를 upsert하고, 이미지 파일을 이 레포의 `public/images/`(Next.js 정적 폴더)로 복사한다.

- 폴더 조합(연도/대분류/중분류/출처/비고) 하나 = 게시물(post) 하나. 그 안의 파일들이
  `post_images`로 들어간다.
- 대분류 폴더명은 정확히 `작품` / `앰버서더` / `기타활동` 이어야 카테고리에 매핑된다.
  다른 이름(예: 테스트로 쓴 `게티뱅크`)은 매핑이 없으므로 건너뛰고 목록으로 알려준다 —
  `import_to_supabase.py` 상단의 `CATEGORY_FOLDER_MAP`을 수정하면 확장 가능.
- 여러 번 실행해도 중복 생성되지 않는다: 게시물은 폴더 경로(`import_key`)로,
  이미지는 복사된 경로(`image_path`)로 upsert.

### 사전 준비

```bash
pip install -r scripts/requirements.txt
```

`supabase/migrations/`를 프로젝트에 먼저 적용해서 categories/tag_groups/tags(출처) 시드까지
끝낸 상태여야 한다. Supabase 프로젝트 설정 → API 메뉴에서 URL과 **service_role** 키를 확인.

```bash
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."   # 절대 프론트/브라우저에 노출 금지
```

### 사용법

```bash
# 1) 먼저 dry-run으로 실행 계획만 확인 (DB/파일 변경 없음)
python scripts/import_to_supabase.py \
  --root "정리한 폴더 경로" \
  --images-dest "public/images" \
  --dry-run

# 2) 문제 없으면 --dry-run 빼고 실제 실행
python scripts/import_to_supabase.py \
  --root "정리한 폴더 경로" \
  --images-dest "public/images"
```

`--images-dest`는 이 레포의 Next.js 이미지 폴더(`public/images`)를 가리키면 된다. DB에는
상대경로만 저장되므로, 나중에 이미지를 Cloudinary 등으로 옮길 때도 `src/lib/image.ts`의
base 경로만 바꾸면 된다.
