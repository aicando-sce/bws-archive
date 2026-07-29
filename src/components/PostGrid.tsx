import type { Database } from "@/types/database";
import PostCard from "./PostCard";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default function PostGrid({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <p className="py-16 text-center text-neutral-500">조건에 맞는 게시물이 없습니다.</p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
