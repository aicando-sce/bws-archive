-- ============================================================
-- filter_posts: 카테고리 + 다중 태그 필터링용 RPC
-- 규칙: 서로 다른 태그 그룹 사이는 AND, 같은 그룹 안에서는 OR
--   예) 연도=2024 AND 출처=(위버스 OR 유튜브) AND 중분류=드라마명
-- Next.js 에서는 supabase.rpc('filter_posts', { p_category_slug, p_tag_ids }) 로 호출
-- ============================================================

create or replace function public.filter_posts(
  p_category_slug text default null,
  p_tag_ids uuid[] default '{}'
)
returns setof public.posts
language sql
stable
as $$
  with input_tags as (
    select t.id as tag_id, t.group_id
    from public.tags t
    where t.id = any(coalesce(p_tag_ids, '{}'))
  ),
  required_groups as (
    select distinct group_id from input_tags
  )
  select p.*
  from public.posts p
  where p.is_published = true
    and (
      p_category_slug is null
      or p.category_id = (select id from public.categories where slug = p_category_slug)
    )
    and not exists (
      select 1
      from required_groups rg
      where not exists (
        select 1
        from public.post_tags pt
        join input_tags it on it.tag_id = pt.tag_id
        where pt.post_id = p.id
          and it.group_id = rg.group_id
      )
    )
  order by p.created_at desc;
$$;
