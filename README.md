# bws-archive

배우 사진 아카이브 사이트. Next.js + Supabase(무료 티어) + Vercel/GitHub Pages, 이미지는 GitHub 레포에서 시작.

## 진행 상황

- [x] DB 스키마 설계 (`supabase/migrations/`, `docs/db-schema.md`)
- [ ] Next.js 프로젝트 스캐폴딩
- [ ] 폴더/엑셀(`archive_excel_generator.py`) → Supabase 임포트 스크립트
- [ ] 프론트엔드(목록/필터/상세)
- [ ] 배포 (Vercel)

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
