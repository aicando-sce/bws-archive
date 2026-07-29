# bws-archive

배우 사진 아카이브 사이트. Next.js + Supabase(무료 티어) + Vercel/GitHub Pages, 이미지는 GitHub 레포에서 시작.

## 진행 상황

- [x] DB 스키마 설계 (`supabase/migrations/`, `docs/db-schema.md`)
- [x] 폴더 → Supabase 임포트 스크립트 (`scripts/import_to_supabase.py`)
- [x] Next.js 스캐폴딩 (카테고리 탭 / 태그 필터 / 목록 / 상세 페이지)
- [ ] 실데이터 임포트 + 배포 (Vercel)

## DB 스키마

자세한 설계 배경과 ERD는 [`docs/db-schema.md`](./docs/db-schema.md) 참고.

핵심 구조:
- `categories`: 최상위 대분류 (작품 / 앰버서더 / 기타활동) — 게시물당 1개
- `tag_groups` + `tags` + `post_tags`: 연도 / 중분류 / 출처 / 비고를 다대다 태그로 표현
- `posts` + `post_images`: 게시물(폴더 단위)과 그 안의 다중 이미지

### 마이그레이션 적용

```bash
supabase link --project-ref <project-ref>
supabase db push
```

또는 Supabase 대시보드 SQL Editor에서 `supabase/migrations/` 안의 파일을 순서대로 실행.

## 폴더 → Supabase 임포트

`scripts/import_to_supabase.py`가 `scripts/archive_excel_generator.py`와 같은 폴더 규칙
(`루트/연도/대분류/중분류/출처/비고/파일`)을 그대로 재사용해서, 같은 폴더 조합에 속한
파일들을 게시물(post) 하나로 묶어 Supabase에 upsert하고 이미지를 지정한 폴더로 복사한다.
재실행해도 안전(idempotent)하다. 자세한 사용법은 [`scripts/README.md`](./scripts/README.md) 참고.

## 프론트엔드 (Next.js)

App Router + TypeScript + Tailwind. 이미지는 이 레포의 `public/images/` 아래에 그대로 두고,
DB(`posts.cover_image_path`, `post_images.image_path`)에는 그 안에서의 상대경로만 저장한다
(나중에 Cloudinary 등으로 옮길 때는 `src/lib/image.ts`의 base 경로만 바꾸면 됨).

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 채우기
npm run dev
```

- `/` — 카테고리 탭(작품/앰버서더/기타활동) + 태그 필터(연도/중분류/출처/비고) + 게시물 그리드
  (`?category=work&tags=<tagId1>,<tagId2>` 쿼리스트링으로 상태 표현, 그룹 간 AND / 그룹 내 OR는
  `filter_posts` RPC가 처리)
- `/posts/[id]` — 게시물 상세(이미지 전체, 태그, 원본 링크)
- 인증/회원가입 없음 — 공개 조회는 `anon` 키 + RLS로, 데이터 등록은 `scripts/import_to_supabase.py`가
  `service_role` 키로 처리

배포는 Vercel 권장(무료, 카드 불필요) — Server Component에서 매 요청마다 Supabase를 조회하는 동적
페이지라 GitHub Pages 같은 완전 정적 호스팅과는 맞지 않는다.
