import { cronAuthorized } from "@/lib/cron/auth";
import { runSteps } from "@/lib/cron/run";
import { expirePremiumMemberships } from "@/lib/membership/expire";
import { settleDeps } from "@/lib/payments/orders";
import { settleStaleOrders } from "@/lib/payments/settle";
import { sendExpiryNotices } from "@/lib/push/expiry";

// 하루 한 번 예약 실행 — vercel.json crons 가 매일 00:00 UTC(한국 9시대)에 부른다. 로그인 없는 길이라 CRON_SECRET 으로 막는다.
// 순서: ① 멈춘 주문 정리(돈 낸 사람이 먼저 프리미엄이 되게) → ② 기간 끝난 프리미엄을 베이직으로 → ③ 유통기한 임박 알림.
// 하나가 실패해도 다음 일은 돈다(lib/cron/run.ts). 같은 날 두 번 불려도 괜찮다 — 셋 다 이미 한 일은 다시 하지 않는다
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });

  const steps = await runSteps([
    {
      name: "settle-orders",
      run: async () => {
        const deps = settleDeps();
        if (!deps) throw new Error("no admin key");
        return settleStaleOrders(deps);
      },
    },
    { name: "expire-premium", run: expirePremiumMemberships },
    { name: "expiry-push", run: () => sendExpiryNotices() },
  ]);
  const ok = steps.every((step) => step.ok);
  // 하나라도 실패하면 500 — Vercel 로그에서 빨갛게 보이게. 내용은 일마다 적힌다
  return Response.json({ ok, steps }, { status: ok ? 200 : 500 });
}
