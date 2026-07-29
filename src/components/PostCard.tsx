import Link from "next/link";
import Image from "next/image";
import type { Database } from "@/types/database";
import { imagePath } from "@/lib/image";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default function PostCard({ post }: { post: Post }) {
  const src = imagePath(post.cover_image_path);
  return (
    <Link href={`/posts/${post.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        {src ? (
          <Image
            src={src}
            alt={post.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            이미지 없음
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {post.title}
      </p>
    </Link>
  );
}
