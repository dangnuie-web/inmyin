// 예약 실행 차례 돌리기 — 하나가 실패 · 멈춰도 다음 일은 돈다. npm run test:cron
import { test } from "node:test";
import assert from "node:assert/strict";
import { runSteps } from "./run.ts";

test("셋 다 돌고, 가운데가 던져도 마지막이 돈다", async () => {
  const order = [];
  const r = await runSteps([
    { name: "a", run: async () => (order.push("a"), { n: 1 }) },
    { name: "b", run: async () => { order.push("b"); throw new Error("boom"); } },
    { name: "c", run: async () => (order.push("c"), "done") },
  ]);
  assert.deepEqual(order, ["a", "b", "c"]);
  assert.deepEqual(r, [
    { name: "a", ok: true, result: { n: 1 } },
    { name: "b", ok: false, error: "boom" },
    { name: "c", ok: true, result: "done" },
  ]);
});

test("멈춘 일은 시간 초과로 끊고 다음으로", async () => {
  const r = await runSteps([
    { name: "stuck", run: () => new Promise(() => {}) },
    { name: "next", run: async () => 1 },
  ], 30);
  assert.equal(r[0].ok, false);
  assert.equal(r[0].error, "timeout");
  assert.deepEqual(r[1], { name: "next", ok: true, result: 1 });
});

test("동기로 던지는 일 · 에러가 아닌 값을 던지는 일도 잡는다", async () => {
  const r = await runSteps([
    { name: "sync", run: () => { throw new Error("sync"); } },
    { name: "str", run: async () => { throw "x".repeat(500); } },
  ]);
  assert.equal(r[0].error, "sync");
  assert.equal(r[1].error.length, 200);
});
