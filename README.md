# bws-archive

배우 사진 아카이브 사이트. Next.js + Supabase(무료 티어) + Vercel, 사진은 Cloudflare R2(무료, 다운로드 트래픽 무료)에 저장.

## 진행 상황

- [x] DB 스키마 설계 (`supabase/migrations/`, `docs/db-schema.md`)
- [x] 폴더 → Supabase + R2 대량 임포트 스크립트 (`scripts/import_to_supabase.py`)
- [x] Next.js 스캐폴딩 (카테고리 탭 / 태그 필터 / 목록 / 상세 페이지)
- [x] 관리자 페이지 (`/admin`) — 비밀번호 로그인, 사진 업로드/태그/텍스트 수정
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

## 이미지 저장 / 데이터 등록 — 두 가지 경로

수천 장 단위의 **대량 등록**과, 평소에 **몇 장씩 추가/수정**하는 건 성격이 달라서 도구를 나눴다.

| | 대상 | 방법 |
|---|---|---|
| **대량 임포트** | 폴더로 정리된 수백~수천 장 | `scripts/import_to_supabase.py` (로컬 실행, 폴더 구조 자동 인식, 재실행해도 안전) |
| **평소 추가/수정** | 몇 장 단위 | `/admin` 관리자 페이지 (브라우저에서 업로드/태그/텍스트 수정) |

두 경로 모두 이미지는 **Cloudflare R2**(무료 10GB, 다운로드 트래픽 완전 무료)에 저장하고,
DB(`posts.cover_image_path`, `post_images.image_path`)에는 R2 공개 URL을 저장한다.
`src/lib/image.ts`가 절대 URL(R2)과 상대경로(예전에 GitHub에 직접 올렸던 이미지)를 둘 다
처리하므로 저장소를 섞어 써도 문제없다.

자세한 사용법은 [`scripts/README.md`](./scripts/README.md) 참고.

## 관리자 페이지 (`/admin`)

- `/admin-login`에서 비밀번호(`ADMIN_PASSWORD` 환경변수) 입력 → 서명된 쿠키로 7일간 로그인 유지
- `/admin` — 게시물 목록, 수정/삭제
- `/admin/posts/new`, `/admin/posts/[id]/edit` — 카테고리 선택, 제목(사진 밑 텍스트)/설명 입력,
  태그 체크박스 선택 + 그 자리에서 새 태그 추가, 사진 여러 장 동시 업로드(브라우저에서 R2로
  직접 업로드하므로 대용량이어도 Vercel 서버리스 함수 제한에 안 걸림)
- 회원가입/사용자 관리 없음 — 관리자 1명 기준의 가벼운 비밀번호 게이트

## 프론트엔드 (Next.js)

App Router + TypeScript + Tailwind.

```bash
npm install
cp .env.local.example .env.local   # 아래 환경변수들 채우기
npm run dev
```

필요한 환경변수:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 공개 조회용
- `SUPABASE_SERVICE_ROLE_KEY` — 관리자 페이지 전용, 절대 브라우저에 노출 금지
- `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` — 관리자 로그인
- `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_BASE_URL` — 관리자 페이지 사진 업로드용

공개 페이지:
- `/` — 카테고리 탭(작품/앰버서더/기타활동) + 태그 필터(연도/중분류/출처/비고) + 게시물 그리드
  (`?category=work&tags=<tagId1>,<tagId2>` 쿼리스트링으로 상태 표현, 그룹 간 AND / 그룹 내 OR는
  `filter_posts` RPC가 처리)
- `/posts/[id]` — 게시물 상세(이미지 전체, 태그, 원본 링크)

공개 조회는 `anon` 키 + RLS로 읽기만 허용되고, 쓰기(등록/수정/삭제)는 `service_role` 키를 쓰는
관리자 페이지와 대량 임포트 스크립트만 할 수 있다.

배포는 Vercel 권장(무료, 카드 불필요) — Server Component에서 매 요청마다 Supabase를 조회하는 동적
페이지라 GitHub Pages 같은 완전 정적 호스팅과는 맞지 않는다.
