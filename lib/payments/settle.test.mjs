// 멈춘 주문 정리 — 토스가 DONE 이면 마무리, 아니면 닫기, 못 닿으면 그대로. npm run test:payments
import { test } from "node:test";
import assert from "node:assert/strict";
import { settleAction, settleStaleOrders, STALE_MINUTES } from "./settle.ts";

const done = (over = {}) => ({ ok: true, payment: { paymentKey: "pk_1", orderId: "inmyin_a", status: "DONE", totalAmount: 2900, ...over } });
const order = (over = {}) => ({ order_id: "inmyin_a", amount: 2900, status: "confirming", ...over });

test("settleAction: DONE · 금액 맞음 → 마무리", () => {
  assert.deepEqual(settleAction(order(), done()), { kind: "complete", paymentKey: "pk_1" });
});

test("settleAction: DONE 인데 금액 다름 · 결제 키 없음 → PAYMENT_MISMATCH", () => {
  assert.deepEqual(settleAction(order(), done({ totalAmount: 100 })), { kind: "fail", code: "PAYMENT_MISMATCH" });
  assert.deepEqual(settleAction(order(), done({ paymentKey: "" })), { kind: "fail", code: "PAYMENT_MISMATCH" });
});

test("settleAction: 다른 상태 → EXPIRED_<상태> 로 닫기", () => {
  for (const status of ["READY", "IN_PROGRESS", "ABORTED", "EXPIRED", "CANCELED"]) {
    assert.deepEqual(settleAction(order(), done({ status })), { kind: "fail", code: `EXPIRED_${status}` });
  }
});

test("settleAction: 결제 없음 → 닫기, 네트워크 · 토스 서버 · 키 없음 · 다른 주문 → 그대로", () => {
  assert.deepEqual(settleAction(order(), { ok: false, code: "NOT_FOUND_PAYMENT", message: "", retryable: false }), { kind: "fail", code: "EXPIRED_NOT_FOUND" });
  assert.deepEqual(settleAction(order(), { ok: false, code: "NETWORK_ERROR", message: "", retryable: true }), { kind: "keep" });
  assert.deepEqual(settleAction(order(), { ok: false, code: "HTTP_500", message: "", retryable: true }), { kind: "keep" });
  assert.deepEqual(settleAction(order(), { ok: false, code: "NO_SECRET_KEY", message: "", retryable: true }), { kind: "keep" });
  assert.deepEqual(settleAction(order(), { ok: false, code: "UNAUTHORIZED_KEY", message: "", retryable: false }), { kind: "keep" });
  assert.deepEqual(settleAction(order(), done({ orderId: "inmyin_other" })), { kind: "keep" });
});

// 가짜 DB: 주문 상태를 실제처럼 옮긴다 (claim 은 ready 일 때만, complete · fail · release 는 confirming 일 때만)
function setup(orders, toss, { completeOk = true, claimOk = true } = {}) {
  const db = new Map(orders.map((o) => [o.order_id, { ...o }]));
  const log = { before: null, fail: [], complete: [] };
  const deps = {
    async listStale(before) {
      log.before = before;
      return [...db.values()].map((o) => ({ ...o }));
    },
    async claim(id) {
      const o = db.get(id);
      if (!claimOk || o.status !== "ready") return false;
      o.status = "confirming";
      return true;
    },
    async release(id) {
      const o = db.get(id);
      if (o.status === "confirming") o.status = "ready";
    },
    async fail(id, code) {
      log.fail.push([id, code]);
      const o = db.get(id);
      if (o.status === "confirming") o.status = "failed";
    },
    async complete(id, key) {
      log.complete.push([id, key]);
      const o = db.get(id);
      if (!completeOk || o.status !== "confirming") return false;
      o.status = "done";
      return true;
    },
    async tossGetPaymentByOrderId(id) {
      return toss[id];
    },
  };
  return { db, log, deps };
}

test("여러 주문: DONE 은 프리미엄, 만료는 failed, 못 닿은 것은 원래대로", async () => {
  const { db, log, deps } = setup(
    [
      order({ order_id: "inmyin_done1" }),
      order({ order_id: "inmyin_ready1", status: "ready" }),
      order({ order_id: "inmyin_gone1" }),
      order({ order_id: "inmyin_net_c" }),
      order({ order_id: "inmyin_net_r", status: "ready" }),
      order({ order_id: "inmyin_bad01" }),
    ],
    {
      inmyin_done1: done({ orderId: "inmyin_done1", paymentKey: "pk_d" }),
      inmyin_ready1: done({ orderId: "inmyin_ready1", paymentKey: "pk_r" }),
      inmyin_gone1: { ok: false, code: "NOT_FOUND_PAYMENT", message: "", retryable: false },
      inmyin_net_c: { ok: false, code: "NETWORK_ERROR", message: "", retryable: true },
      inmyin_net_r: { ok: false, code: "NETWORK_ERROR", message: "", retryable: true },
      inmyin_bad01: done({ orderId: "inmyin_bad01", totalAmount: 1 }),
    },
  );
  const now = new Date("2026-10-22T00:00:00Z");
  const r = await settleStaleOrders(deps, now);
  assert.deepEqual(r, { checked: 6, completed: 2, failed: 1, mismatched: 1, kept: 2 });
  assert.equal(now.getTime() - log.before.getTime(), STALE_MINUTES * 60_000);
  assert.equal(db.get("inmyin_done1").status, "done");
  assert.equal(db.get("inmyin_ready1").status, "done");
  assert.equal(db.get("inmyin_gone1").status, "failed");
  assert.equal(db.get("inmyin_net_c").status, "confirming");
  assert.equal(db.get("inmyin_net_r").status, "ready");
  assert.equal(db.get("inmyin_bad01").status, "failed");
  assert.deepEqual(log.complete, [["inmyin_done1", "pk_d"], ["inmyin_ready1", "pk_r"]]);
  assert.deepEqual(log.fail, [["inmyin_gone1", "EXPIRED_NOT_FOUND"], ["inmyin_bad01", "PAYMENT_MISMATCH"]]);
});

test("ready 를 다른 요청이 먼저 잡았으면 건드리지 않는다", async () => {
  const { db, log, deps } = setup([order({ status: "ready" })], { inmyin_a: done() }, { claimOk: false });
  const r = await settleStaleOrders(deps);
  assert.equal(r.checked, 0);
  assert.equal(db.get("inmyin_a").status, "ready");
  assert.equal(log.complete.length, 0);
});

test("DB 마무리가 실패하면 ready 로 돌려 두고 다음에 다시", async () => {
  const { db, deps } = setup([order()], { inmyin_a: done() }, { completeOk: false });
  const r = await settleStaleOrders(deps);
  assert.deepEqual(r, { checked: 1, completed: 0, failed: 0, mismatched: 0, kept: 1 });
  assert.equal(db.get("inmyin_a").status, "ready");
});

test("done · failed 주문이 섞여 와도 손대지 않는다", async () => {
  const { log, deps } = setup([order({ status: "done" }), order({ order_id: "inmyin_f", status: "failed" })], {});
  const r = await settleStaleOrders(deps);
  assert.equal(r.checked, 0);
  assert.equal(log.fail.length + log.complete.length, 0);
});
