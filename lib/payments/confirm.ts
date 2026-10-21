// 결제 승인 — 토스 결제창이 successUrl 로 돌려보낸 뒤 서버가 하는 일. 시험: npm run test:payments
//
// 브라우저가 보낸 값(paymentKey · orderId · amount)은 하나도 믿지 않는다:
// - 주문은 서버가 먼저 만들어 둔 것만 받는다. 남의 주문이면 없는 것으로 본다
// - 주소의 금액이 주문 금액과 다르면 토스에 묻기 전에 멈춘다. 토스에는 늘 주문에 적힌 금액을 보낸다
// - 토스가 "승인됐다"고 해도 결제 상태 · 금액 · 주문 번호가 맞는지 한 번 더 본다
// - 같은 주문은 한 요청만 잡는다(ready → confirming). 새로고침 · 두 번 누르기로 두 번 승인되지 않는다
//
// DB · 토스 호출은 밖에서 넣어 준다(deps) — 시험에서 가짜로 바꿔 끼우려고. 이 파일은 아무것도 불러오지 않는다(node --test 로 바로 돈다)

export type PaymentOrder = {
  order_id: string;
  user_id: string;
  amount: number;
  status: "ready" | "confirming" | "done" | "failed" | string;
  payment_key: string | null;
};

export type TossPayment = { paymentKey: string; orderId: string; status: string; totalAmount: number };

// 토스 응답을 줄인 것. retryable = 네트워크 · 토스 서버 쪽 문제라 다시 해 볼 수 있음
export type TossResult = { ok: true; payment: TossPayment } | { ok: false; code: string; message: string; retryable: boolean };

export type ConfirmDeps = {
  getOrder(orderId: string): Promise<PaymentOrder | null>;
  // ready → confirming. 잡았으면 true (다른 요청이 먼저 잡았으면 false)
  claim(orderId: string): Promise<boolean>;
  // confirming → ready (토스에 못 닿았을 때 다시 해 볼 수 있게)
  release(orderId: string): Promise<void>;
  // confirming → failed (토스가 거절)
  fail(orderId: string, code: string): Promise<void>;
  // confirming → done + 프리미엄. 마무리했으면 true
  complete(orderId: string, paymentKey: string): Promise<boolean>;
  tossConfirm(input: { paymentKey: string; orderId: string; amount: number }): Promise<TossResult>;
  tossGetPayment(paymentKey: string): Promise<TossResult>;
};

export type ConfirmResult = { ok: true; orderId: string; already: boolean } | { ok: false; code: string };

// 토스 규칙: 주문 번호는 영문 · 숫자 · - _ = 6~64자
export const ORDER_ID_PATTERN = /^[A-Za-z0-9_=-]{6,64}$/;
const PAYMENT_KEY_PATTERN = /^[A-Za-z0-9_=-]{1,200}$/;

export function newOrderId() {
  return `inmyin_${crypto.randomUUID().replaceAll("-", "")}`;
}

// successUrl 의 쿼리를 읽는다. 모양이 틀리면 null
export function readSuccessParams(params: Record<string, string | string[] | undefined>) {
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const paymentKey = one("paymentKey");
  const orderId = one("orderId");
  const amountText = one("amount");
  if (!PAYMENT_KEY_PATTERN.test(paymentKey) || !ORDER_ID_PATTERN.test(orderId) || !/^\d{1,9}$/.test(amountText)) return null;
  return { paymentKey, orderId, amount: Number(amountText) };
}

function matches(payment: TossPayment, order: PaymentOrder, paymentKey: string) {
  return (
    payment.status === "DONE" &&
    payment.orderId === order.order_id &&
    payment.paymentKey === paymentKey &&
    payment.totalAmount === order.amount
  );
}

export async function confirmPayment(
  userId: string,
  input: { paymentKey: string; orderId: string; amount: number },
  deps: ConfirmDeps,
): Promise<ConfirmResult> {
  const order = await deps.getOrder(input.orderId);
  if (!order || order.user_id !== userId) return { ok: false, code: "NOT_FOUND_ORDER" };

  // 이미 끝난 주문 — 같은 결제로 돌아온 것(새로고침)이면 성공 화면을 다시 보여 준다
  if (order.status === "done") {
    return order.payment_key === input.paymentKey ? { ok: true, orderId: order.order_id, already: true } : { ok: false, code: "ORDER_CLOSED" };
  }
  if (order.status === "failed") return { ok: false, code: "ORDER_CLOSED" };
  if (order.status === "confirming") return { ok: false, code: "IN_PROGRESS" };

  // 금액 위조 — 토스에 묻지도 않는다
  if (input.amount !== order.amount) return { ok: false, code: "AMOUNT_MISMATCH" };

  if (!(await deps.claim(order.order_id))) return { ok: false, code: "IN_PROGRESS" };

  let result = await deps.tossConfirm({ paymentKey: input.paymentKey, orderId: order.order_id, amount: order.amount });

  // 앞선 요청이 토스 승인까지는 갔는데 우리 쪽 마무리 전에 끊겼던 경우 — 토스에 결제 상태를 물어 이어서 마무리한다
  if (!result.ok && result.code === "ALREADY_PROCESSED_PAYMENT") {
    result = await deps.tossGetPayment(input.paymentKey);
  }

  if (!result.ok) {
    if (result.retryable) await deps.release(order.order_id);
    else await deps.fail(order.order_id, result.code);
    return { ok: false, code: result.code };
  }

  if (!matches(result.payment, order, input.paymentKey)) {
    await deps.fail(order.order_id, "PAYMENT_MISMATCH");
    return { ok: false, code: "PAYMENT_MISMATCH" };
  }

  // 토스 승인은 됐는데 우리 DB 마무리가 안 됐다 — ready 로 돌려 두면 새로고침이 위의 ALREADY_PROCESSED_PAYMENT 길로 이어서 마무리한다
  if (!(await deps.complete(order.order_id, input.paymentKey))) {
    await deps.release(order.order_id);
    return { ok: false, code: "SERVER_ERROR" };
  }
  return { ok: true, orderId: order.order_id, already: false };
}

// 취소는 실패와 다른 화면 글로 — 모바일은 failUrl 로 PAY_PROCESS_CANCELED, PC 결제창(창 닫기)은 USER_CANCEL
export function isCancelCode(code: string) {
  return code === "PAY_PROCESS_CANCELED" || code === "USER_CANCEL";
}

// 실패 화면의 글. 주소에 실려 온 토스 message 는 쓰지 않는다(누가 고쳐 보낸 글일 수 있어서) — 코드만 보고 우리 글로
const FAIL_MESSAGES: Record<string, string> = {
  AMOUNT_MISMATCH: "결제 금액이 주문과 달라서 멈췄어요.",
  NOT_FOUND_ORDER: "주문을 찾지 못했어요. 처음부터 다시 해 주세요.",
  ORDER_CLOSED: "이미 끝난 주문이에요. 처음부터 다시 해 주세요.",
  IN_PROGRESS: "결제를 확인하는 중이에요. 잠시 뒤 플랜 화면을 다시 열어 주세요.",
  PAYMENT_MISMATCH: "결제 내용이 주문과 달라서 멈췄어요.",
  REJECT_CARD_COMPANY: "카드사에서 결제를 거절했어요. 다른 카드로 해 주세요.",
  NOT_FOUND_PAYMENT_SESSION: "결제 시간이 지났어요. 처음부터 다시 해 주세요.",
  PAY_PROCESS_ABORTED: "결제가 중간에 멈췄어요. 다시 해 주세요.",
  INVALID_REQUEST: "결제 정보가 올바르지 않아요. 처음부터 다시 해 주세요.",
};

export function failMessage(code: string) {
  return FAIL_MESSAGES[code] ?? "결제를 마치지 못했어요. 잠시 뒤 다시 해 주세요.";
}
