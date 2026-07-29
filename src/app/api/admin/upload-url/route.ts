import { NextResponse } from "next/server";
import { getPublicUrl, getUploadUrl } from "@/lib/r2";
import { isAdminAuthenticated } from "@/lib/requireAdmin";

type FileRequest = { filename: string; contentType: string };

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "관리자 로그인이 필요합니다." }, { status: 401 });
  }

  const { files } = (await request.json().catch(() => ({}))) as { files?: FileRequest[] };
  if (!files || files.length === 0) {
    return NextResponse.json({ error: "files가 비어 있습니다." }, { status: 400 });
  }

  try {
    const uploads = await Promise.all(
      files.map(async (file) => {
        const key = `posts/${crypto.randomUUID()}-${sanitizeFilename(file.filename)}`;
        const uploadUrl = await getUploadUrl(key, file.contentType);
        return { key, uploadUrl, publicUrl: getPublicUrl(key) };
      })
    );
    return NextResponse.json({ uploads });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "업로드 URL 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
