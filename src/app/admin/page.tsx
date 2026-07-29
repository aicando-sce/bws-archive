import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { imagePath } from "@/lib/image";
import { isAdminAuthenticated } from "@/lib/requireAdmin";
import DeletePostButton from "@/components/admin/DeletePostButton";

// 게시물 목록은 매 요청 최신 상태를 보여줘야 하므로 정적 프리렌더링에서 제외한다.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin-login");

  const [{ data: posts, error }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from("posts")
      .select("id, title, cover_image_path, category_id")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("categories").select("id, name"),
  ]);

  if (error) {
    return <p className="text-sm text-red-600">게시물을 불러오지 못했습니다: {error.message}</p>;
  }

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">게시물 관리</h1>
        <Link
          href="/admin/posts/new"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          + 새 게시물
        </Link>
      </div>

      {!posts || posts.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-500">아직 게시물이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {posts.map((post) => {
            const src = imagePath(post.cover_image_path);
            return (
              <li key={post.id} className="flex items-center gap-4 py-3">
                <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-900">
                  {src && <Image src={src} alt={post.title} fill className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{post.title}</p>
                  <p className="text-xs text-neutral-500">{categoryNameById.get(post.category_id)}</p>
                </div>
                <Link href={`/admin/posts/${post.id}/edit`} className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
                  수정
                </Link>
                <DeletePostButton id={post.id} title={post.title} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
