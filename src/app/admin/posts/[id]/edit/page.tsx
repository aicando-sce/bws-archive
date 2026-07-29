import { notFound, redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminAuthenticated } from "@/lib/requireAdmin";
import PostForm from "@/components/admin/PostForm";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) redirect("/admin-login");

  const { id } = await params;

  const [{ data: categories }, { data: tagGroups }, { data: tags }, { data: post }, { data: images }, { data: postTags }] =
    await Promise.all([
      supabaseAdmin.from("categories").select("id, slug, name").order("sort_order"),
      supabaseAdmin.from("tag_groups").select("id, slug, name").order("sort_order"),
      supabaseAdmin.from("tags").select("id, group_id, category_id, name").order("sort_order"),
      supabaseAdmin.from("posts").select("*").eq("id", id).maybeSingle(),
      supabaseAdmin.from("post_images").select("image_path").eq("post_id", id).order("sort_order"),
      supabaseAdmin.from("post_tags").select("tag_id").eq("post_id", id),
    ]);

  if (!post) notFound();

  const categorySlug = (categories ?? []).find((c) => c.id === post.category_id)?.slug ?? "";

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">게시물 수정</h1>
      <PostForm
        categories={categories ?? []}
        tagGroups={tagGroups ?? []}
        tags={tags ?? []}
        initial={{
          id: post.id,
          categorySlug,
          title: post.title,
          description: post.description,
          tagIds: (postTags ?? []).map((pt) => pt.tag_id),
          images: (images ?? []).map((img) => ({ path: img.image_path })),
        }}
      />
    </div>
  );
}
