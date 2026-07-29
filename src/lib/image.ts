// image_path에는 두 종류가 섞여 들어올 수 있다:
// 1) 이 레포 public/images/ 기준 상대경로 (파이썬 스크립트로 GitHub에 올린 기존 이미지)
// 2) Cloudflare R2 공개 URL 전체 (관리자 페이지에서 업로드한 이미지)
// 절대 URL이면 그대로 쓰고, 아니면 상대경로로 취급해 /images/ 밑에서 찾는다.
export function imagePath(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `/images/${encoded}`;
}
