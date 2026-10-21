// 결제 승인 시험 — 금액 위조 · 중복 승인 · 실패 응답 · 남의 주문. npm run test:payments
import { test } from "node:test";
import assert from "node:assert/strict";
import { confirmPayment, failMessage, isCancelCode, newOrderId, ORDER_ID_PATTERN, readSuccessParams } from "./confirm.ts";

const USER = "user-1";
const KEY = "tgen_20261021abc";

// 가짜 DB + 가짜 토스. 실제처럼 claim 은 ready 일 때 한 번만 잡힌다
function setup({ toss = "ok", status = "ready", amount = 2900, owner = USER, completeOk = true } = {}) {
  const order = { order_id: "inmyin_order01", user_id: owner, amount, status, payment_key: null };
  const calls = { tossConfirm: [], tossGet: 0, complete: 0, fail: [], release: 0 };
  const paid = { paymentKey: KEY, orderId: order.order_id, status: "DONE", totalAmount: 2900 };
  const deps = {
    async getOrder(id) {
      return id === order.order_id ? { ...order } : null;
    },
    async claim() {
      if (order.status !== "ready") return false;
      order.status = "confirming";
      return true;
    },
    async release() {
      calls.release++;
      if (order.status === "confirming") order.status = "ready";
    },
    async fail(_id, code) {
      calls.fail.push(code);
      order.status = "failed";
    },
    async complete(_id, key) {
      calls.complete++;
      if (!completeOk || order.status !== "confirming") return false;
      order.status = "done";
      order.payment_key = key;
      return true;
    },
    async tossConfirm(input) {
      calls.tossConfirm.push(input);
      if (toss === "ok") return { ok: true, payment: { ...paid, totalAmount: input.amount } };
      if (toss === "reject") return { ok: false, code: "REJECT_CARD_COMPANY", message: "거절", retryable: false };
      if (toss === "network") return { ok: false, code: "NETWORK_ERROR", message: "", retryable: true };
      if (toss === "already") return { ok: false, code: "ALREADY_PROCESSED_PAYMENT", message: "", retryable: false };
      if (toss === "wrong-amount") return { ok: true, payment: { ...paid, totalAmount: 100 } };
      if (toss === "not-done") return { ok: true, payment: { ...paid, status: "WAITING_FOR_DEPOSIT" } };
    },
    async tossGetPayment() {
      calls.tossGet++;
      return { ok: true, payment: paid };
    },
  };
  return { order, calls, deps };
}

const input = (over = {}) => ({ paymentKey: KEY, orderId: "inmyin_order01", amount: 2900, ...over });

test("정상: 주문 금액으로 승인하고 프리미엄으로 마무리", async () => {
  const { order, calls, deps } = setup();
  const r = await confirmPayment(USER, input(), deps);
  assert.deepEqual(r, { ok: true, orderId: "inmyin_order01", already: false });
  assert.equal(order.status, "done");
  assert.equal(calls.complete, 1);
  assert.deepEqual(calls.tossConfirm, [{ paymentKey: KEY, orderId: "inmyin_order01", amount: 2900 }]);
});

test("금액 위조: 주소의 금액이 주문과 다르면 토스에 묻지도 않는다", async () => {
  const { order, calls, deps } = setup();
  const r = await confirmPayment(USER, input({ amount: 100 }), deps);
  assert.deepEqual(r, { ok: false, code: "AMOUNT_MISMATCH" });
  assert.equal(calls.tossConfirm.length, 0);
  assert.equal(calls.complete, 0);
  assert.equal(order.status, "ready");
});

test("금액 위조: 토스가 다른 금액으로 승인했다고 하면 프리미엄을 주지 않는다", async () => {
  const { order, calls, deps } = setup({ toss: "wrong-amount" });
  const r = await confirmPayment(USER, input(), deps);
  assert.deepEqual(r, { ok: false, code: "PAYMENT_MISMATCH" });
  assert.equal(calls.complete, 0);
  assert.equal(order.status, "failed");
});

test("결제 상태가 DONE 이 아니면 프리미엄을 주지 않는다", async () => {
  const { calls, deps } = setup({ toss: "not-done" });
  const r = await confirmPayment(USER, input(), deps);
  assert.equal(r.ok, false);
  assert.equal(calls.complete, 0);
});

test("중복 승인: 같은 주문을 동시에 두 번 보내도 토스 승인 · 마무리는 한 번", async () => {
  const { calls, deps } = setup();
  const [a, b] = await Promise.all([confirmPayment(USER, input(), deps), confirmPayment(USER, input(), deps)]);
  assert.equal([a, b].filter((r) => r.ok).length, 1);
  assert.equal([a, b].find((r) => !r.ok).code, "IN_PROGRESS");
  assert.equal(calls.tossConfirm.length, 1);
  assert.equal(calls.complete, 1);
});

test("중복 승인: 끝난 뒤 새로고침하면 다시 승인하지 않고 성공 화면", async () => {
  const { calls, deps } = setup();
  await confirmPayment(USER, input(), deps);
  const again = await confirmPayment(USER, input(), deps);
  assert.deepEqual(again, { ok: true, orderId: "inmyin_order01", already: true });
  assert.equal(calls.tossConfirm.length, 1);
  assert.equal(calls.complete, 1);
});

test("중복 승인: 끝난 주문에 다른 결제 키를 붙여 오면 막는다", async () => {
  const { deps } = setup();
  await confirmPayment(USER, input(), deps);
  const r = await confirmPayment(USER, input({ paymentKey: "tgen_other" }), deps);
  assert.deepEqual(r, { ok: false, code: "ORDER_CLOSED" });
});

test("실패 응답: 카드사 거절이면 주문을 실패로 닫고 코드를 돌려준다", async () => {
  const { order, calls, deps } = setup({ toss: "reject" });
  const r = await confirmPayment(USER, input(), deps);
  assert.deepEqual(r, { ok: false, code: "REJECT_CARD_COMPANY" });
  assert.equal(order.status, "failed");
  assert.equal(calls.complete, 0);
  // 닫힌 주문은 다시 못 쓴다
  assert.deepEqual(await confirmPayment(USER, input(), deps), { ok: false, code: "ORDER_CLOSED" });
});

test("실패 응답: 토스에 못 닿으면 주문을 ready 로 돌려 다시 해 볼 수 있게", async () => {
  const { order, calls, deps } = setup({ toss: "network" });
  const r = await confirmPayment(USER, input(), deps);
  assert.deepEqual(r, { ok: false, code: "NETWORK_ERROR" });
  assert.equal(order.status, "ready");
  assert.equal(calls.release, 1);
});

test("이미 승인된 결제(ALREADY_PROCESSED_PAYMENT)는 토스에 상태를 물어 이어서 마무리", async () => {
  const { order, calls, deps } = setup({ toss: "already" });
  const r = await confirmPayment(USER, input(), deps);
  assert.equal(r.ok, true);
  assert.equal(calls.tossGet, 1);
  assert.equal(order.status, "done");
});

test("DB 마무리가 실패하면 ready 로 돌려 새로고침이 이어서 마무리할 수 있게", async () => {
  const { order, deps } = setup({ completeOk: false });
  const r = await confirmPayment(USER, input(), deps);
  assert.deepEqual(r, { ok: false, code: "SERVER_ERROR" });
  assert.equal(order.status, "ready");
});

test("남의 주문 · 없는 주문은 없는 것으로", async () => {
  const other = setup({ owner: "user-2" });
  assert.deepEqual(await confirmPayment(USER, input(), other.deps), { ok: false, code: "NOT_FOUND_ORDER" });
  assert.equal(other.calls.tossConfirm.length, 0);
  const { deps } = setup();
  assert.deepEqual(await confirmPayment(USER, input({ orderId: "inmyin_nothing" }), deps), { ok: false, code: "NOT_FOUND_ORDER" });
});

test("successUrl 쿼리: 모양이 틀리면 null", () => {
  assert.deepEqual(readSuccessParams({ paymentKey: KEY, orderId: "inmyin_order01", amount: "2900" }), {
    paymentKey: KEY,
    orderId: "inmyin_order01",
    amount: 2900,
  });
  assert.equal(readSuccessParams({ paymentKey: KEY, orderId: "inmyin_order01", amount: "-1" }), null);
  assert.equal(readSuccessParams({ paymentKey: KEY, orderId: "inmyin_order01", amount: "29.5" }), null);
  assert.equal(readSuccessParams({ paymentKey: "a b", orderId: "inmyin_order01", amount: "2900" }), null);
  assert.equal(readSuccessParams({ paymentKey: KEY, orderId: "abc", amount: "2900" }), null);
  assert.equal(readSuccessParams({ paymentKey: [KEY, KEY], orderId: "inmyin_order01", amount: "2900" }), null);
});

test("주문 번호는 토스 규칙(영문 · 숫자 · - _ =, 6~64자)에 맞고 매번 다르다", () => {
  const a = newOrderId();
  assert.match(a, ORDER_ID_PATTERN);
  assert.notEqual(a, newOrderId());
});

test("취소 코드 · 실패 글", () => {
  assert.equal(isCancelCode("PAY_PROCESS_CANCELED"), true);
  assert.equal(isCancelCode("USER_CANCEL"), true);
  assert.equal(isCancelCode("REJECT_CARD_COMPANY"), false);
  assert.match(failMessage("AMOUNT_MISMATCH"), /금액/);
  assert.match(failMessage("<script>"), /결제를 마치지 못했어요/);
});
