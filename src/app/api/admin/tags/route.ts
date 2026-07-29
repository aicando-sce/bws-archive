import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminAuthenticated } from "@/lib/requireAdmin";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { groupSlug, categorySlug, name } = (await request.json().catch(() => ({}))) as {
    groupSlug?: string;
    categorySlug?: string | null;
    name?: string;
  };

  const trimmedName = name?.trim();
  if (!groupSlug || !trimmedName) {
    return NextResponse.json({ error: "groupSlug와 name은 필수입니다." }, { status: 400 });
  }

  const { data: group, error: groupError } = await supabaseAdmin
    .from("tag_groups")
    .select("id")
    .eq("slug", groupSlug)
    .maybeSingle();
  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });
  if (!group) return NextResponse.json({ error: `tag_group '${groupSlug}'를 찾을 수 없습니다.` }, { status: 404 });

  let categoryId: string | null = null;
  if (categorySlug) {
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 500 });
    if (!category) {
      return NextResponse.json({ error: `category '${categorySlug}'를 찾을 수 없습니다.` }, { status: 404 });
    }
    categoryId = category.id;
  }

  const existingQuery = supabaseAdmin
    .from("tags")
    .select("id, name")
    .eq("group_id", group.id)
    .eq("name", trimmedName);
  const { data: existing, error: existingError } = categoryId
    ? await existingQuery.eq("category_id", categoryId).maybeSingle()
    : await existingQuery.is("category_id", null).maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (existing) return NextResponse.json({ id: existing.id, name: existing.name });

  const { data: created, error: createError } = await supabaseAdmin
    .from("tags")
    .insert({ group_id: group.id, category_id: categoryId, name: trimmedName, slug: trimmedName })
    .select("id, name")
    .single();
  if (createError) return NextResponse.json({ error: createError.message }, { status: 500 });

  return NextResponse.json({ id: created.id, name: created.name });
}
