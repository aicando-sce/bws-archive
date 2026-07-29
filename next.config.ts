import type { NextConfig } from "next";

// R2_PUBLIC_BASE_URL(관리자 페이지 업로드 이미지가 올라가는 Cloudflare R2 공개 URL)의
// 호스트명만 next/image 허용 목록에 자동으로 추가한다. 값이 없으면(로컬에서 아직
// R2를 설정 안 한 경우) 그냥 빈 목록으로 두고, 기존 레포 내 public/images 이미지만 쓴다.
const r2Hostname = process.env.R2_PUBLIC_BASE_URL
  ? new URL(process.env.R2_PUBLIC_BASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: r2Hostname ? [{ protocol: "https", hostname: r2Hostname }] : [],
  },
};

export default nextConfig;
