-- ============================================================
-- 기본 분류 체계 시드 데이터
-- 연도/중분류/비고 태그는 게시물 등록 시(엑셀 자동화 스크립트) 동적으로 생성되는 값이 많아
-- 여기서는 고정적인 categories / tag_groups / 출처(source) 태그만 미리 넣어둔다.
-- ============================================================

insert into public.categories (slug, name, sort_order) values
  ('work', '작품', 1),
  ('ambassador', '앰버서더', 2),
  ('other', '기타활동', 3);

insert into public.tag_groups (slug, name, sort_order) values
  ('year', '연도', 1),
  ('subcategory', '중분류', 2),
  ('source', '출처', 3),
  ('note', '비고', 4);

-- 출처 태그는 목록이 고정적이므로 미리 시드
insert into public.tags (group_id, category_id, name, slug, sort_order)
select g.id, null, v.name, v.slug, v.sort_order
from public.tag_groups g
cross join (values
  ('위버스', 'weverse', 1),
  ('위버스 DM', 'weverse-dm', 2),
  ('배우 인스타', 'actor-instagram', 3),
  ('소속사 인스타', 'agency-instagram', 4),
  ('기타 인스타', 'other-instagram', 5),
  ('블로그', 'blog', 6),
  ('유튜브', 'youtube', 7),
  ('매거진', 'magazine', 8),
  ('기사', 'article', 9)
) as v(name, slug, sort_order)
where g.slug = 'source';
