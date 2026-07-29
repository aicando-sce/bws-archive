import "server-only";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2는 S3 호환 API를 제공하므로 aws-sdk의 S3Client를 그대로 쓴다.
// 관리자 페이지에서 업로드하는 사진 전용 저장소 (기존 폴더 임포트 스크립트가 다루는
// GitHub 레포 이미지와는 별개 — src/lib/image.ts가 두 경로를 모두 처리한다).

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

function assertConfigured() {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
    throw new Error(
      "R2 환경변수가 설정되지 않았습니다 (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME/R2_PUBLIC_BASE_URL)."
    );
  }
}

let client: S3Client | null = null;

function getClient(): S3Client {
  assertConfigured();
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
  }
  return client;
}

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  assertConfigured();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(getClient(), command, { expiresIn: 5 * 60 });
}

export function getPublicUrl(key: string): string {
  assertConfigured();
  return `${publicBaseUrl}/${key}`;
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function objectKeyFromPublicUrl(url: string): string | null {
  if (!publicBaseUrl || !url.startsWith(publicBaseUrl)) return null;
  return url.slice(publicBaseUrl.length + 1);
}
