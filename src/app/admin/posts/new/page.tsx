import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminAuthenticated } from "@/lib/requireAdmin";
import PostForm from "@/components/admin/PostForm";

// 태그/카테고리 목록이 최신 상태여야 하므로 정적 프리렌더링에서 제외한다.
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin-login");

  const [{ data: categories }, { data: tagGroups }, { data: tags }] = await Promise.all([
    supabaseAdmin.from("categories").select("id, slug, name").order("sort_order"),
    supabaseAdmin.from("tag_groups").select("id, slug, name").order("sort_order"),
    supabaseAdmin.from("tags").select("id, group_id, category_id, name").order("sort_order"),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">새 게시물</h1>
      <PostForm categories={categories ?? []} tagGroups={tagGroups ?? []} tags={tags ?? []} />
    </div>
  );
}
