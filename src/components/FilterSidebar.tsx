"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { TagGroupWithTags } from "@/lib/queries";

export default function FilterSidebar({
  tagGroups,
  selectedCategoryId,
  selectedTagIds,
}: {
  tagGroups: TagGroupWithTags[];
  selectedCategoryId: string | null;
  selectedTagIds: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggleTag(tagId: string) {
    const next = new Set(selectedTagIds);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next.size > 0) {
      params.set("tags", Array.from(next).join(","));
    } else {
      params.delete("tags");
    }
    router.push(`/?${params.toString()}`);
  }

  const visibleGroups = tagGroups
    .map((group) => ({
      ...group,
      tags: group.tags.filter(
        (tag) => tag.category_id === null || tag.category_id === selectedCategoryId
      ),
    }))
    .filter((group) => group.tags.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <aside className="w-full shrink-0 space-y-6 md:w-56">
      {visibleGroups.map((group) => (
        <div key={group.id}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {group.name}
          </h3>
          <ul className="space-y-1">
            {group.tags.map((tag) => (
              <li key={tag.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                    className="h-4 w-4 rounded border-neutral-300"
                  />
                  {tag.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
