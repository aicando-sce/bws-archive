// DB에는 GitHub 레포(현재는 이 Next.js 레포의 public/images) 기준 상대경로만 저장한다.
// 나중에 Cloudinary 등으로 옮길 때도 이 함수만 바꾸면 된다.
export function imagePath(relativePath: string | null): string | null {
  if (!relativePath) return null;
  const encoded = relativePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/images/${encoded}`;
}
