import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. .env.local을 확인하세요."
  );
}

// 로그인/세션이 없는 공개 조회 전용 사이트라 서버/클라이언트 구분 없이 단일 클라이언트로 충분하다.
// anon 키는 RLS로 조회만 허용되므로 노출되어도 안전하다.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
