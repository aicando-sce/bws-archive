import { getCategories, getFilteredPosts, getTagGroupsWithTags } from "@/lib/queries";
import CategoryNav from "@/components/CategoryNav";
import FilterSidebar from "@/components/FilterSidebar";
import PostGrid from "@/components/PostGrid";

type SearchParams = { category?: string; tags?: string };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const categorySlug = params.category ?? null;
  const tagIds = params.tags ? params.tags.split(",").filter(Boolean) : [];

  const [categories, tagGroups, posts] = await Promise.all([
    getCategories(),
    getTagGroupsWithTags(),
    getFilteredPosts({ categorySlug, tagIds }),
  ]);

  const selectedCategory = categories.find((c) => c.slug === categorySlug) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <CategoryNav categories={categories} activeSlug={categorySlug} />
      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        <FilterSidebar
          tagGroups={tagGroups}
          selectedCategoryId={selectedCategory?.id ?? null}
          selectedTagIds={tagIds}
        />
        <div className="flex-1">
          <p className="mb-4 text-sm text-neutral-500">{posts.length}개의 게시물</p>
          <PostGrid posts={posts} />
        </div>
      </div>
    </div>
  );
}
