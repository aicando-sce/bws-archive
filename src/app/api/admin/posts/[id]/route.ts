import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { deleteObject, objectKeyFromPublicUrl } from "@/lib/r2";
import { isAdminAuthenticated } from "@/lib/requireAdmin";

type PostPayload = {
  categorySlug: string;
  title: string;
  description?: string | null;
  tagIds: string[];
  images: { path: string; sortOrder: number }[];
};

async function removeOrphanedImages(existingPaths: string[], nextPaths: Set<string>) {
  const removed = existingPaths.filter((path) => !nextPaths.has(path));
  await Promise.all(
    removed.map(async (path) => {
      const key = objectKeyFromPublicUrl(path);
      if (key) await deleteObject(key).catch(() => {});
    })
  );
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
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

  const { data: existingImages, error: existingImagesError } = await supabaseAdmin
    .from("post_images")
    .select("image_path")
    .eq("post_id", id);
  if (existingImagesError) {
    return NextResponse.json({ error: existingImagesError.message }, { status: 500 });
  }

  const sortedImages = [...body.images].sort((a, b) => a.sortOrder - b.sortOrder);
  await removeOrphanedImages(
    (existingImages ?? []).map((img) => img.image_path),
    new Set(sortedImages.map((img) => img.path))
  );

  const { error: updateError } = await supabaseAdmin
    .from("posts")
    .update({
      category_id: category.id,
      title: body.title,
      description: body.description || null,
      cover_image_path: sortedImages[0]?.path ?? null,
    })
    .eq("id", id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: deleteImagesError } = await supabaseAdmin.from("post_images").delete().eq("post_id", id);
  if (deleteImagesError) return NextResponse.json({ error: deleteImagesError.message }, { status: 500 });

  const { error: imagesError } = await supabaseAdmin
    .from("post_images")
    .insert(sortedImages.map((img, i) => ({ post_id: id, image_path: img.path, sort_order: i })));
  if (imagesError) return NextResponse.json({ error: imagesError.message }, { status: 500 });

  const { error: deleteTagsError } = await supabaseAdmin.from("post_tags").delete().eq("post_id", id);
  if (deleteTagsError) return NextResponse.json({ error: deleteTagsError.message }, { status: 500 });

  if (body.tagIds.length > 0) {
    const { error: tagsError } = await supabaseAdmin
      .from("post_tags")
      .insert(body.tagIds.map((tagId) => ({ post_id: id, tag_id: tagId })));
    if (tagsError) return NextResponse.json({ error: tagsError.message }, { status: 500 });
  }

  return NextResponse.json({ id });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;

  const { data: images, error: imagesError } = await supabaseAdmin
    .from("post_images")
    .select("image_path")
    .eq("post_id", id);
  if (imagesError) return NextResponse.json({ error: imagesError.message }, { status: 500 });

  await removeOrphanedImages((images ?? []).map((img) => img.image_path), new Set());

  const { error } = await supabaseAdmin.from("posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
