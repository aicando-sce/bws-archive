import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "./adminSession";

// Proxy(구 middleware)가 /admin, /api/admin 경로를 이미 막아주지만,
// Next.js 문서 상 Proxy는 "완전한 세션/인가 수단으로 쓰지 말라"고 명시하고 있어서
// 실제 데이터를 다루는 서버 코드(라우트 핸들러/서버 컴포넌트) 쪽에서도 한 번 더 검증한다.
export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE_NAME)?.value);
}
