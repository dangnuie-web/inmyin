import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// 서비스 키로 여는 Supabase — 남을 막는 규칙(RLS)을 넘는다. 서버 함수 · Route Handler 에서만, 꼭 필요할 때만 부른다.
// 지금 쓰는 곳: 푸시 알림(lib/push/) — 받는 사람의 기기 목록은 보내는 사람이 볼 수 없어서.
// 결제(lib/payments/orders.ts) — 주문 표 · plan 은 본인도 못 바꾸고 서버만 바꾼다.
// 키가 없으면(.env.local · Vercel 에 SUPABASE_SECRET_KEY 를 안 넣었으면) null — 부르는 쪽이 조용히 건너뛴다.
// 화면 쪽 코드("use client")에서 불러오지 않는다: NEXT_PUBLIC_ 이 아니라 브라우저로는 값이 안 가지만, 실수로라도 묶이지 않게
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
