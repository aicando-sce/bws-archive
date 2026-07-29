"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePostButton({ id, title }: { id: string; title: string }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!confirm(`"${title}" 게시물을 삭제할까요? 이미지도 함께 삭제되며 되돌릴 수 없습니다.`)) {
      return;
    }
    setPending(true);
    const res = await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
    setPending(false);
    if (!res.ok) {
      alert("삭제에 실패했습니다.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "삭제 중..." : "삭제"}
    </button>
  );
}
