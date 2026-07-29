-- ============================================================
-- Actor Photo Archive - Initial Schema
-- 최상위 카테고리(작품/앰버서더/기타활동) + 다대다 태그(연도/중분류/출처/비고)
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- updated_at 자동 갱신 트리거 함수
-- ------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- categories: 최상위 대분류 (작품 / 앰버서더 / 기타활동)
-- 게시물(post)당 1개만 연결되는 단일 선택 값
-- ------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.categories is '최상위 카테고리: 작품 / 앰버서더 / 기타활동';

-- ------------------------------------------------------------
-- tag_groups: 필터 그룹 (연도 / 중분류 / 출처 / 비고)
-- UI에서 필터 섹션을 나누는 기준
-- ------------------------------------------------------------
create table public.tag_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.tag_groups is '태그 그룹: 연도 / 중분류 / 출처 / 비고 등 필터 카테고리';

-- ------------------------------------------------------------
-- tags: 실제 태그 값 (다대다 관계의 한 축)
-- category_id 가 있으면 해당 카테고리에서만 노출되는 태그
-- (예: '브랜드명' 계열 중분류 태그는 앰버서더 카테고리에서만 사용)
-- category_id 가 null 이면 카테고리 무관 공통 태그 (예: 연도, 출처)
-- ------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tag_groups(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index tags_group_id_idx on public.tags(group_id);
create index tags_category_id_idx on public.tags(category_id);

-- Postgres unique 제약은 NULL끼리 서로 다른 값으로 취급하므로,
-- category_id가 null인 태그(연도/출처/비고 등 카테고리 무관 태그)의 중복을 막으려면
-- 부분 유니크 인덱스 2개로 나눠야 한다.
create unique index tags_unique_scoped on public.tags(group_id, category_id, slug)
  where category_id is not null;
create unique index tags_unique_global on public.tags(group_id, slug)
  where category_id is null;

comment on table public.tags is '태그 값. group_id로 필터 그룹을, category_id(nullable)로 카테고리 종속 여부를 표현';

-- ------------------------------------------------------------
-- posts: 게시물(사진첩 단위 = 폴더 1개에 대응)
-- ------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  title text not null,
  description text,
  cover_image_path text,
  taken_at date,
  source_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_category_id_idx on public.posts(category_id);
create index posts_is_published_idx on public.posts(is_published);
create index posts_created_at_idx on public.posts(created_at desc);

comment on table public.posts is '게시물(사진첩) 단위. 폴더 정리 → 엑셀 자동화 결과 1행이 여기에 대응';
comment on column public.posts.cover_image_path is 'GitHub 레포 내 상대경로. 실제 URL은 프론트에서 base URL과 조합 (추후 Cloudinary 전환 시 base URL만 교체)';

create trigger posts_set_updated_at
  before update on public.posts
  for each row
  execute function public.handle_updated_at();

-- ------------------------------------------------------------
-- post_images: 게시물 내 다중 이미지
-- ------------------------------------------------------------
create table public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  image_path text not null,
  width int,
  height int,
  sort_order int not null default 0,
  alt_text text,
  created_at timestamptz not null default now()
);

create index post_images_post_id_idx on public.post_images(post_id);

comment on column public.post_images.image_path is 'GitHub 레포 내 상대경로 (cover_image_path와 동일 방식)';

-- ------------------------------------------------------------
-- post_tags: Post <-> Tag 다대다 조인 테이블
-- ------------------------------------------------------------
create table public.post_tags (
  post_id uuid not null references public.posts(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create index post_tags_tag_id_idx on public.post_tags(tag_id);
