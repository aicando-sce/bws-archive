"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { imagePath } from "@/lib/image";

type Category = { id: string; slug: string; name: string };
type Tag = { id: string; group_id: string; category_id: string | null; name: string };
type TagGroup = { id: string; slug: string; name: string };

type ImageItem = {
  key: string; // React key, stable per item
  path: string | null; // null until uploaded
  previewUrl: string;
  file?: File;
  status: "existing" | "pending" | "uploading" | "error";
};

export type PostFormInitial = {
  id: string;
  categorySlug: string;
  title: string;
  description: string | null;
  tagIds: string[];
  images: { path: string }[];
};

export default function PostForm({
  categories,
  tagGroups,
  tags,
  initial,
}: {
  categories: Category[];
  tagGroups: TagGroup[];
  tags: Tag[];
  initial?: PostFormInitial;
}) {
  const router = useRouter();
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? categories[0]?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set(initial?.tagIds ?? []));
  const [newTagDrafts, setNewTagDrafts] = useState<Record<string, string>>({});
  const [images, setImages] = useState<ImageItem[]>(
    (initial?.images ?? []).map((img, i) => ({
      key: `existing-${i}`,
      path: img.path,
      previewUrl: imagePath(img.path) ?? "",
      status: "existing",
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategoryId = useMemo(
    () => categories.find((c) => c.slug === categorySlug)?.id ?? null,
    [categories, categorySlug]
  );

  const visibleGroups = useMemo(
    () =>
      tagGroups
        .map((g) => ({
          ...g,
          tags: tags.filter((t) => t.group_id === g.id && (t.category_id === null || t.category_id === selectedCategoryId)),
        })),
    [tagGroups, tags, selectedCategoryId]
  );

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const items: ImageItem[] = Array.from(fileList).map((file) => ({
      key: `new-${crypto.randomUUID()}`,
      path: null,
      previewUrl: URL.createObjectURL(file),
      file,
      status: "pending",
    }));
    setImages((prev) => [...prev, ...items]);
  }

  function removeImage(key: string) {
    setImages((prev) => prev.filter((img) => img.key !== key));
  }

  async function addNewTag(group: TagGroup) {
    const name = newTagDrafts[group.id]?.trim();
    if (!name) return;
    const res = await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupSlug: group.slug, categorySlug, name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "태그 추가에 실패했습니다.");
      return;
    }
    const created = (await res.json()) as { id: string; name: string };
    tags.push({ id: created.id, group_id: group.id, category_id: selectedCategoryId, name: created.name });
    setSelectedTagIds((prev) => new Set(prev).add(created.id));
    setNewTagDrafts((prev) => ({ ...prev, [group.id]: "" }));
  }

  async function uploadPendingImages(): Promise<ImageItem[]> {
    const pending = images.filter((img) => img.status === "pending" && img.file);
    if (pending.length === 0) return images;

    setImages((prev) => prev.map((img) => (img.status === "pending" ? { ...img, status: "uploading" } : img)));

    const res = await fetch("/api/admin/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: pending.map((img) => ({ filename: img.file!.name, contentType: img.file!.type || "application/octet-stream" })),
      }),
    });
    if (!res.ok) throw new Error("업로드 URL을 받아오지 못했습니다.");
    const { uploads } = (await res.json()) as { uploads: { key: string; uploadUrl: string; publicUrl: string }[] };

    await Promise.all(
      pending.map((img, i) =>
        fetch(uploads[i].uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": img.file!.type || "application/octet-stream" },
          body: img.file,
        })
      )
    );

    const uploadedByKey = new Map(pending.map((img, i) => [img.key, uploads[i].publicUrl]));
    const nextImages = images.map((img) =>
      uploadedByKey.has(img.key) ? { ...img, path: uploadedByKey.get(img.key)!, status: "existing" as const } : img
    );
    setImages(nextImages);
    return nextImages;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error("제목을 입력하세요.");
      if (images.length === 0) throw new Error("사진을 1장 이상 추가하세요.");

      const finalImages = await uploadPendingImages();
      const payload = {
        categorySlug,
        title: title.trim(),
        description: description.trim() || null,
        tagIds: Array.from(selectedTagIds),
        images: finalImages.map((img, i) => ({ path: img.path!, sortOrder: i })),
      };

      const res = await fetch(initial ? `/api/admin/posts/${initial.id}` : "/api/admin/posts", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "저장에 실패했습니다.");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setImages((prev) => prev.map((img) => (img.status === "uploading" ? { ...img, status: "error" } : img)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">카테고리</label>
        <select
          value={categorySlug}
          onChange={(e) => setCategorySlug(e.target.value)}
          className="rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          제목 (사진 밑에 표시되는 텍스트)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          placeholder="예: 구르미 그린 달빛 스틸컷"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">설명 (선택)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleGroups.map((group) => (
          <div key={group.id}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{group.name}</h3>
            <div className="flex flex-wrap gap-2">
              {group.tags.map((tag) => (
                <label
                  key={tag.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                    selectedTagIds.has(tag.id)
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedTagIds.has(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newTagDrafts[group.id] ?? ""}
                onChange={(e) => setNewTagDrafts((prev) => ({ ...prev, [group.id]: e.target.value }))}
                placeholder="새 태그 추가"
                className="w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
              />
              <button
                type="button"
                onClick={() => addNewTag(group)}
                className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
              >
                추가
              </button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">사진 (여러 장 선택 가능)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="mb-3 text-sm"
        />
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {images.map((img) => (
              <div key={img.key} className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
                <Image src={img.previewUrl} alt="" fill unoptimized className="object-cover" />
                {img.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white">
                    업로드 중...
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img.key)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                  aria-label="이미지 삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {submitting ? "저장 중..." : initial ? "수정 저장" : "게시물 만들기"}
        </button>
      </div>
    </form>
  );
}
