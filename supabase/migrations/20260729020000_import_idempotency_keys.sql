-- ============================================================
-- 폴더 기반 임포트 스크립트(scripts/import_to_supabase.py)를
-- 여러 번 재실행해도 안전하게(upsert) 만들기 위한 키
-- ============================================================

alter table public.posts add column import_key text;

-- 폴더 경로(연도/대분류/중분류/출처/비고)를 그대로 저장하는 자연키.
-- 수동으로 만든 게시물은 import_key가 없을 수 있으므로 부분 유니크 인덱스로 처리.
create unique index posts_import_key_key on public.posts(import_key)
  where import_key is not null;

-- image_path는 GitHub 레포 상대경로 = 사실상 자연키이므로 재실행 시 upsert 기준으로 사용
create unique index post_images_image_path_key on public.post_images(image_path);
