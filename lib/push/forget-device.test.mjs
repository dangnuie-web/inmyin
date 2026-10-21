// 로그아웃 때 이 기기 푸시 구독 풀기 — 어떤 실패에도 던지지 않고 로그아웃이 이어지는지. npm run test:push
import { test } from "node:test";
import assert from "node:assert/strict";
import { forgetThisDevicePush } from "./forget-device.ts";

const EP = "https://fcm.googleapis.com/fcm/send/abc";
function sw({ sub = true, unsubscribe = async () => true, getRegistration } = {}) {
  const calls = { unsubscribe: 0 };
  const subscription = sub ? { endpoint: EP, unsubscribe: async () => (calls.unsubscribe++, unsubscribe()) } : null;
  return {
    calls,
    sw: { getRegistration: getRegistration ?? (async () => ({ pushManager: { getSubscription: async () => subscription } })) },
  };
}

test("구독이 있으면 브라우저에서 풀고 주소를 돌려준다", async () => {
  const { sw: s, calls } = sw();
  assert.equal(await forgetThisDevicePush(s), EP);
  assert.equal(calls.unsubscribe, 1);
});

test("브라우저 풀기가 실패해도 주소는 돌려준다 (서버 줄은 지우게)", async () => {
  const { sw: s } = sw({ unsubscribe: async () => { throw new Error("no"); } });
  assert.equal(await forgetThisDevicePush(s), EP);
});

test("구독 없음 · 서비스워커 없음 · 등록 없음 · pushManager 없음 → null", async () => {
  assert.equal(await forgetThisDevicePush(sw({ sub: false }).sw), null);
  assert.equal(await forgetThisDevicePush(undefined), null);
  assert.equal(await forgetThisDevicePush({ getRegistration: async () => undefined }), null);
  assert.equal(await forgetThisDevicePush({ getRegistration: async () => ({}) }), null);
});

test("등록 읽기가 던지거나 멈춰도 null 로 빨리 끝난다", async () => {
  assert.equal(await forgetThisDevicePush({ getRegistration: async () => { throw new Error("x"); } }), null);
  const started = Date.now();
  assert.equal(await forgetThisDevicePush({ getRegistration: () => new Promise(() => {}) }, 30), null);
  assert.ok(Date.now() - started < 1000);
});

test("풀기가 멈춰도 시간 안에 주소를 돌려준다", async () => {
  const { sw: s } = sw({ unsubscribe: () => new Promise(() => {}) });
  assert.equal(await forgetThisDevicePush(s, 30), EP);
});
