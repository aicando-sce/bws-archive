-- ============================================================
-- Row Level Security
-- 공개 열람(anon)은 읽기만 허용. 쓰기는 service_role(자동화 스크립트)만 가능
-- → RLS 활성화 후 anon/authenticated용 insert/update/delete 정책을 만들지 않으면
--   해당 롤은 기본적으로 쓰기가 막히고, service_role은 RLS를 우회하므로 그대로 사용 가능
-- ============================================================

alter table public.categories enable row level security;
alter table public.tag_groups enable row level security;
alter table public.tags enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.post_tags enable row level security;

create policy "categories_public_read"
  on public.categories for select
  using (true);

create policy "tag_groups_public_read"
  on public.tag_groups for select
  using (true);

create policy "tags_public_read"
  on public.tags for select
  using (true);

create policy "posts_public_read_published_only"
  on public.posts for select
  using (is_published = true);

create policy "post_images_public_read_of_published_posts"
  on public.post_images for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_images.post_id
        and p.is_published = true
    )
  );

create policy "post_tags_public_read_of_published_posts"
  on public.post_tags for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_tags.post_id
        and p.is_published = true
    )
  );
