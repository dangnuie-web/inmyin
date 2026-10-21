// 멈춘 주문 정리 — 하루 한 번 예약 실행(/api/cron/daily)이 부른다. 시험: npm run test:payments
//
// 결제 승인(confirm.ts)이 중간에 끊기면 주문이 둘 중 하나로 남는다:
// - confirming: 승인 요청이 돌던 중에 서버가 꺼졌다 (토스는 승인했을 수도, 아닐 수도)
// - ready: 토스에 못 닿았거나 우리 DB 마무리가 실패해 되돌려 둔 것 · 결제창을 열고 그냥 나간 것
// 돈은 나갔는데 프리미엄이 안 된 사람이 없게, 만든 지 STALE_MINUTES 넘은 주문을 토스에 주문 번호로 물어 정리한다.
// - 토스가 DONE(금액 · 주문 번호 맞음) → 프리미엄으로 마무리 (complete_premium_order)
// - DONE 인데 금액이 다름 → failed 'PAYMENT_MISMATCH' (사람이 보고 환불해야 한다 — 결과에 따로 센다)
// - 그 밖의 상태 · 결제가 없음 → failed 'EXPIRED_<상태>' (토스 결제는 30분 안에 승인 안 되면 만료된다. 1시간 지났으니 끝난 것)
// - 토스에 못 닿음(네트워크 · 토스 서버 · 키 없음 등) → 그대로 두고 내일 다시
// 같은 주문을 화면의 승인 요청과 동시에 만지지 않게, ready 는 먼저 confirming 으로 잡고(claim) 시작한다.
// 이 파일은 아무것도 불러오지 않는다(node --test 로 바로 돈다). DB · 토스는 밖에서 넣어 준다(deps)

import type { TossResult } from "./confirm";

// 토스 만료(30분)보다 넉넉하게
export const STALE_MINUTES = 60;
// 한 번에 정리할 주문 수 (토스 조회가 하나에 최대 20초)
export const SETTLE_BATCH = 20;

export type StaleOrder = { order_id: string; amount: number; status: string };

export type SettleDeps = {
  // 만든 지 STALE_MINUTES 넘은 ready · confirming 주문 (오래된 것부터, 최대 SETTLE_BATCH 개)
  listStale(before: Date, limit: number): Promise<StaleOrder[]>;
  claim(orderId: string): Promise<boolean>;
  release(orderId: string): Promise<void>;
  fail(orderId: string, code: string): Promise<void>;
  complete(orderId: string, paymentKey: string): Promise<boolean>;
  tossGetPaymentByOrderId(orderId: string): Promise<TossResult>;
};

export type SettleAction = { kind: "complete"; paymentKey: string } | { kind: "fail"; code: string } | { kind: "keep" };

// 토스 조회 결과로 무엇을 할지 (순수 함수)
export function settleAction(order: StaleOrder, toss: TossResult): SettleAction {
  if (!toss.ok) {
    if (toss.code === "NOT_FOUND_PAYMENT" || toss.code === "HTTP_404") return { kind: "fail", code: "EXPIRED_NOT_FOUND" };
    return { kind: "keep" };
  }
  const payment = toss.payment;
  if (payment.orderId !== order.order_id) return { kind: "keep" };
  if (payment.status === "DONE") {
    if (payment.totalAmount !== order.amount || !payment.paymentKey) return { kind: "fail", code: "PAYMENT_MISMATCH" };
    return { kind: "complete", paymentKey: payment.paymentKey };
  }
  // 아직 진행 중으로 보이는 상태(READY · IN_PROGRESS)도 1시간 넘었으면 토스에서 곧 만료다 — 승인하지 않고 닫는다
  return { kind: "fail", code: `EXPIRED_${payment.status || "UNKNOWN"}`.slice(0, 100) };
}

export type SettleResult = { checked: number; completed: number; failed: number; mismatched: number; kept: number };

export async function settleStaleOrders(deps: SettleDeps, now = new Date()): Promise<SettleResult> {
  const before = new Date(now.getTime() - STALE_MINUTES * 60_000);
  const orders = await deps.listStale(before, SETTLE_BATCH);
  const result: SettleResult = { checked: 0, completed: 0, failed: 0, mismatched: 0, kept: 0 };

  for (const order of orders) {
    // ready 는 먼저 잡는다. 못 잡았으면 그사이 다른 요청이 가져간 것 — 건너뛴다
    if (order.status === "ready" && !(await deps.claim(order.order_id))) continue;
    if (order.status !== "ready" && order.status !== "confirming") continue;
    result.checked++;

    const action = settleAction(order, await deps.tossGetPaymentByOrderId(order.order_id));
    if (action.kind === "complete") {
      if (await deps.complete(order.order_id, action.paymentKey)) result.completed++;
      else {
        // DB 마무리가 안 됐다 — ready 로 돌려 두면 내일 다시 (사용자가 새로고침해도 confirm.ts 가 이어서 마무리)
        await deps.release(order.order_id);
        result.kept++;
      }
    } else if (action.kind === "fail") {
      await deps.fail(order.order_id, action.code);
      if (action.code === "PAYMENT_MISMATCH") result.mismatched++;
      else result.failed++;
    } else {
      // 처음 상태로 둔다 — ready 였으면 ready 로, confirming 이었으면 confirming 그대로
      if (order.status === "ready") await deps.release(order.order_id);
      result.kept++;
    }
  }
  return result;
}
