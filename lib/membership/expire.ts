import { createAdminClient } from "@/lib/supabase/admin";

// 프리미엄 기간 끝난 사람을 베이직으로 — 하루 한 번 예약 실행(/api/cron/daily)이 부른다.
// plan 만 바꾼다. 만든 인벤토리 · 칸(50) · 물건은 그대로, 새로 만들기 · 북마크 추가만 베이직 한도(lib/plans.ts)로 막힌다.
// DB 함수: supabase/migrations/20261021140000_expire_premium.sql
export async function expirePremiumMemberships(): Promise<{ downgraded: number }> {
  const admin = createAdminClient();
  if (!admin) throw new Error("no admin key");
  const { data, error } = await admin.rpc("expire_premium_memberships");
  if (error) throw new Error(`expire_premium_memberships: ${error.code ?? "error"}`);
  return { downgraded: data ?? 0 };
}
