import { supabase } from "./supabase";
import type { Database } from "@/types/database";

type Category = Database["public"]["Tables"]["categories"]["Row"];
type TagGroup = Database["public"]["Tables"]["tag_groups"]["Row"];
type Tag = Database["public"]["Tables"]["tags"]["Row"];
type Post = Database["public"]["Tables"]["posts"]["Row"];
type PostImage = Database["public"]["Tables"]["post_images"]["Row"];

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export type TagGroupWithTags = TagGroup & { tags: Tag[] };

export async function getTagGroupsWithTags(): Promise<TagGroupWithTags[]> {
  const [{ data: groups, error: groupsError }, { data: tags, error: tagsError }] =
    await Promise.all([
      supabase.from("tag_groups").select("*").order("sort_order"),
      supabase.from("tags").select("*").order("sort_order"),
    ]);
  if (groupsError) throw groupsError;
  if (tagsError) throw tagsError;

  return (groups ?? []).map((group) => ({
    ...group,
    tags: (tags ?? []).filter((tag) => tag.group_id === group.id),
  }));
}

export async function getFilteredPosts(params: {
  categorySlug?: string | null;
  tagIds?: string[];
}): Promise<Post[]> {
  const { data, error } = await supabase.rpc("filter_posts", {
    p_category_slug: params.categorySlug ?? null,
    p_tag_ids: params.tagIds ?? [],
  });
  if (error) throw error;
  return data ?? [];
}

export type PostWithDetails = Post & { images: PostImage[]; tags: Tag[] };

export async function getPostDetail(id: string): Promise<PostWithDetails | null> {
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  if (postError) throw postError;
  if (!post) return null;

  const [{ data: images, error: imagesError }, { data: postTags, error: postTagsError }] =
    await Promise.all([
      supabase.from("post_images").select("*").eq("post_id", id).order("sort_order"),
      supabase.from("post_tags").select("tag_id").eq("post_id", id),
    ]);
  if (imagesError) throw imagesError;
  if (postTagsError) throw postTagsError;

  const tagIds = (postTags ?? []).map((pt) => pt.tag_id);
  let tags: Tag[] = [];
  if (tagIds.length > 0) {
    const { data, error } = await supabase.from("tags").select("*").in("id", tagIds);
    if (error) throw error;
    tags = data ?? [];
  }

  return { ...post, images: images ?? [], tags };
}
