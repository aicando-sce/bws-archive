# scripts/

## 1. `archive_excel_generator.py` (기존)

폴더(`루트/연도/대분류/중분류/출처/비고/파일`)를 훑어서 연도별 시트로 나뉜 엑셀 대장을
만든다. 사람이 눈으로 확인/검수하는 용도.

```bash
python archive_excel_generator.py --root "정리할 폴더 경로" --output "아카이브_대장.xlsx"
```

## 2. `import_to_supabase.py` (신규, 대량 임포트용)

같은 폴더 규칙을 그대로 재사용해서 Supabase(`posts`/`tags`/`post_tags`/`post_images`)에
데이터를 upsert하고, 사진은 리사이즈(긴 변 2000px, JPEG 품질 85)한 뒤 Cloudflare
R2(무료 10GB, 다운로드 트래픽 완전 무료)에 업로드한다. 원본 해상도 그대로 올리면
사진이 몇천 장 단위일 때 용량이 금방 커지기 때문에 리사이즈는 필수로 걸어뒀다.

수천 장 단위의 **대량** 임포트는 이 스크립트로, **몇 장 추가/수정하는 건** 관리자
웹페이지(`/admin`)로 하는 걸 권장한다 — 브라우저로 수천 장을 올리면 중간에 인터넷이
끊기거나 창을 닫았을 때 복구하기 어렵지만, 이 스크립트는 로컬에서 안정적으로 돌릴 수
있고 재실행해도 안전하다(아래 참고).

- 폴더 조합(연도/대분류/중분류/출처/비고) 하나 = 게시물(post) 하나. 그 안의 파일들이
  `post_images`로 들어간다.
- 대분류 폴더명은 정확히 `작품` / `앰버서더` / `기타활동` 이어야 카테고리에 매핑된다.
  다른 이름(예: 테스트로 쓴 `게티뱅크`)은 매핑이 없으므로 건너뛰고 목록으로 알려준다 —
  `import_to_supabase.py` 상단의 `CATEGORY_FOLDER_MAP`을 수정하면 확장 가능.
- 여러 번 실행해도 중복 생성/중복 업로드되지 않는다: 게시물은 폴더 경로(`import_key`)로,
  이미지는 R2에 이미 같은 경로로 올라가 있는지 확인(`image_path`)한 뒤 없을 때만 업로드.

### 사전 준비

```bash
pip install -r scripts/requirements.txt
```

1. `supabase/migrations/`를 프로젝트에 먼저 적용해서 categories/tag_groups/tags(출처) 시드까지
   끝낸 상태여야 한다. Supabase 프로젝트 설정 → API 메뉴에서 URL과 **service_role** 키를 확인.
2. Cloudflare 계정(무료) 만들고 R2 버킷 하나 생성 → 버킷 설정에서 "Public access" 켜서
   `pub-xxxxxxxx.r2.dev` 형태의 공개 URL 활성화 → R2 → "Manage API tokens"에서
   Access Key ID / Secret Access Key 발급.

```bash
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."   # 절대 프론트/브라우저에 노출 금지
export R2_ACCOUNT_ID="..."
export R2_ACCESS_KEY_ID="..."
export R2_SECRET_ACCESS_KEY="..."        # 이것도 절대 노출 금지
export R2_BUCKET_NAME="bws-archive-images"
export R2_PUBLIC_BASE_URL="https://pub-xxxxxxxx.r2.dev"
```

### 사용법

```bash
# 1) 먼저 dry-run으로 실행 계획만 확인 (DB/R2 변경 없음)
python scripts/import_to_supabase.py --root "정리한 폴더 경로" --dry-run

# 2) 문제 없으면 --dry-run 빼고 실제 실행
python scripts/import_to_supabase.py --root "정리한 폴더 경로"
```

이미지는 GitHub 레포가 아니라 R2에 올라가고, DB(`image_path`)에는 R2 공개 URL 전체가
저장된다. Next.js(`src/lib/image.ts`)는 절대 URL이면 그대로 쓰고, 상대경로면 이 레포
`public/images/`에서 찾도록 이미 처리돼 있어서 — 예전에 GitHub에 직접 올려둔 이미지가
있어도 계속 정상 작동한다.
