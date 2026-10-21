// 결제 주문 표(payment_orders) 다루기 — 서버 전용. 로그인한 사람은 이 표를 못 만지므로 서비스 키(createAdminClient)로 한다.
// 표는 supabase/migrations/20261021130000_payment_orders.sql. 아직 운영 DB 에 없으면 주문이 안 만들어져 결제 버튼이 안내 글만 띄운다
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PLANS, PREMIUM_PASS } from "@/lib/plans";
import { newOrderId, type ConfirmDeps, type PaymentOrder } from "./confirm";
import type { SettleDeps } from "./settle";
import { tossConfirm, tossGetPayment, tossGetPaymentByOrderId } from "./toss";

// 결제 버튼을 누르면 먼저 주문을 만든다. 금액 · 기간은 서버의 상수에서만 온다
export async function createPremiumOrder(userId: string) {
  const admin = createAdminClient();
  if (!admin) return null;
  const order = {
    order_id: newOrderId(),
    user_id: userId,
    plan: PREMIUM_PASS.plan,
    amount: PREMIUM_PASS.price,
    months: PREMIUM_PASS.months,
  };
  const { error } = await admin.from("payment_orders").insert(order);
  if (error) return null;
  return { orderId: order.order_id, amount: order.amount, orderName: PREMIUM_PASS.orderName };
}

export function confirmDeps(): ConfirmDeps | null {
  const admin = createAdminClient();
  if (!admin) return null;
  return {
    async getOrder(orderId) {
      const { data } = await admin
        .from("payment_orders")
        .select("order_id, user_id, amount, status, payment_key")
        .eq("order_id", orderId)
        .maybeSingle();
      return (data as PaymentOrder | null) ?? null;
    },
    // 조건부 갱신이라 동시에 두 요청이 와도 한쪽만 줄을 돌려받는다
    async claim(orderId) {
      const { data } = await admin
        .from("payment_orders")
        .update({ status: "confirming" })
        .eq("order_id", orderId)
        .eq("status", "ready")
        .select("order_id");
      return (data?.length ?? 0) === 1;
    },
    async release(orderId) {
      await admin.from("payment_orders").update({ status: "ready" }).eq("order_id", orderId).eq("status", "confirming");
    },
    async fail(orderId, code) {
      await admin
        .from("payment_orders")
        .update({ status: "failed", fail_code: code.slice(0, 100) })
        .eq("order_id", orderId)
        .eq("status", "confirming");
    },
    async complete(orderId, paymentKey) {
      const { data, error } = await admin.rpc("complete_premium_order", {
        p_order_id: orderId,
        p_payment_key: paymentKey,
        p_slot_count: PLANS.premium.slotCount,
      });
      return !error && Boolean(data);
    },
    tossConfirm,
    tossGetPayment,
  };
}

// 멈춘 주문 정리(lib/payments/settle.ts)에 넣어 줄 DB · 토스. 잡기 · 되돌리기 · 실패 · 마무리는 결제 승인과 같은 것을 쓴다
export function settleDeps(): SettleDeps | null {
  const base = confirmDeps();
  const admin = createAdminClient();
  if (!base || !admin) return null;
  return {
    async listStale(before, limit) {
      const { data, error } = await admin
        .from("payment_orders")
        .select("order_id, amount, status")
        .in("status", ["ready", "confirming"])
        .lt("created_at", before.toISOString())
        .order("created_at", { ascending: true })
        .limit(limit);
      // 표가 아직 없으면(운영 DB 적용 전) 이 일만 실패로 적히고 예약 실행의 다른 일은 계속 돈다
      if (error) throw new Error(`payment_orders: ${error.code ?? "error"}`);
      return data ?? [];
    },
    claim: base.claim,
    release: base.release,
    fail: base.fail,
    complete: base.complete,
    tossGetPaymentByOrderId,
  };
}

// 프리미엄이 언제까지인지 (플랜 · 결제 완료 화면). 표가 아직 없거나 기록이 없으면 null
export async function readPremiumUntil(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("memberships").select("premium_until").eq("user_id", userId).maybeSingle();
  return data?.premium_until ?? null;
}
