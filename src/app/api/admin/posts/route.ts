import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminAuthenticated } from "@/lib/requireAdmin";

type PostPayload = {
  categorySlug: string;
  title: string;
  description?: string | null;
  tagIds: string[];
  images: { path: string; sortOrder: number }[];
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as PostPayload | null;
  if (!body || !body.categorySlug || !body.title || !body.images?.length) {
    return NextResponse.json({ error: "categorySlug, title, images는 필수입니다." }, { status: 400 });
  }

  const { data: category, error: categoryError } = await supabaseAdmin
    .from("categories")
    .select("id")
    .eq("slug", body.categorySlug)
    .maybeSingle();
  if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 500 });
  if (!category) return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });

  const sortedImages = [...body.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const { data: post, error: postError } = await supabaseAdmin
    .from("posts")
    .insert({
      category_id: category.id,
      title: body.title,
      description: body.description || null,
      cover_image_path: sortedImages[0]?.path ?? null,
    })
    .select("id")
    .single();
  if (postError) return NextResponse.json({ error: postError.message }, { status: 500 });

  const { error: imagesError } = await supabaseAdmin
    .from("post_images")
    .insert(sortedImages.map((img, i) => ({ post_id: post.id, image_path: img.path, sort_order: i })));
  if (imagesError) return NextResponse.json({ error: imagesError.message }, { status: 500 });

  if (body.tagIds.length > 0) {
    const { error: tagsError } = await supabaseAdmin
      .from("post_tags")
      .insert(body.tagIds.map((tagId) => ({ post_id: post.id, tag_id: tagId })));
    if (tagsError) return NextResponse.json({ error: tagsError.message }, { status: 500 });
  }

  return NextResponse.json({ id: post.id });
}
