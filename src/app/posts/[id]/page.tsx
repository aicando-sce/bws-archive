import { notFound } from "next/navigation";
import Image from "next/image";
import { getPostDetail } from "@/lib/queries";
import { imagePath } from "@/lib/image";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostDetail(id);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{post.title}</h1>
      {post.description && (
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">{post.description}</p>
      )}
      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {post.images.map((image) => {
          const src = imagePath(image.image_path);
          if (!src) return null;
          return (
            <div
              key={image.id}
              className="relative aspect-[4/5] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900"
            >
              <Image
                src={src}
                alt={image.alt_text ?? post.title}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          );
        })}
      </div>
      {post.source_url && (
        <a
          href={post.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm text-blue-600 hover:underline"
        >
          원본 보기 →
        </a>
      )}
    </div>
  );
}
