// 배경 지우는 동안의 진행률 정리 시험. npm run test:image
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  borderPath,
  CUTOUT_LOADING,
  fakeProgress,
  newProgressTracker,
  pillText,
  saveWaitMs,
  stepShown,
  trackProgress,
} from "./cutout-motion.ts";

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("내려받기 — key 마다 모아 합하고 전체의 80% 까지", () => {
  const t = newProgressTracker();
  near(trackProgress(t, "fetch:/models/isnet_fp16", 50, 100).value, 0.4);
  near(trackProgress(t, "fetch:/models/isnet_fp16", 100, 100).value, 0.8);
  assert.equal(trackProgress(t, "fetch:/models/isnet_fp16", 100, 100).next, 0.8);
});

test("새 key 가 늦게 나타나 전체가 커져도 값은 줄지 않는다", () => {
  const t = newProgressTracker();
  trackProgress(t, "fetch:/models/isnet_fp16", 100, 100); // 0.8
  const p = trackProgress(t, "fetch:/onnxruntime-web/ort-wasm.wasm", 10, 100); // 계산상 0.44
  near(p.value, 0.8);
  // 더 받아 계산상 값이 넘으면 다시 오름 — 다 받으면 0.8
  near(trackProgress(t, "fetch:/onnxruntime-web/ort-wasm.wasm", 100, 100).value, 0.8);
});

test("계산 네 단계 — 0.8 + 단계/4 × 0.2, next 는 다음 단계", () => {
  const t = newProgressTracker();
  trackProgress(t, "fetch:/models/isnet_fp16", 30, 100);
  let p = trackProgress(t, "compute:decode", 0, 4);
  near(p.value, 0.8);
  near(p.next, 0.85);
  p = trackProgress(t, "compute:inference", 1, 4);
  near(p.value, 0.85);
  near(p.next, 0.9);
  p = trackProgress(t, "compute:mask", 2, 4);
  near(p.value, 0.9);
  p = trackProgress(t, "compute:encode", 4, 4);
  near(p.value, 1);
  near(p.next, 1);
});

test("계산이 시작된 뒤 늦게 온 내려받기는 값을 바꾸지 않는다 · 모르는 key 는 무시", () => {
  const t = newProgressTracker();
  trackProgress(t, "compute:inference", 1, 4);
  near(trackProgress(t, "fetch:/late", 1, 1000).value, 0.85);
  near(trackProgress(t, "something", 1, 1).value, 0.85);
});

test("가짜 곡선 — 0 에서 시작해 오르고 fakeCap 을 넘지 않는다", () => {
  assert.equal(fakeProgress(0), 0);
  assert.ok(fakeProgress(3000) > fakeProgress(1000));
  assert.ok(fakeProgress(10 * 60 * 1000) <= CUTOUT_LOADING.fakeCap);
  near(fakeProgress(1e9), CUTOUT_LOADING.fakeCap, 1e-6);
  assert.equal(fakeProgress(-5), 0);
});

test("선 길이 — 목표까지 부드럽게 따라가고 넘지 않는다", () => {
  let shown = 0;
  const target = { value: 0.5, next: 0.8 };
  const a = stepShown(shown, target, 200, 200);
  assert.ok(a > 0 && a < 0.5);
  for (let i = 0; i < 200; i++) shown = stepShown(shown, target, 200, 200);
  assert.ok(shown >= 0.5 - 1e-6 && shown <= 0.79 + 1e-9);
});

test("간격이 달라도 같은 시간이면 거의 같은 곳 (프레임 · tick 무관)", () => {
  const target = { value: 0.6, next: 0.8 };
  let a = 0;
  for (let i = 0; i < 60; i++) a = stepShown(a, target, 1000 / 60, 0);
  const b = stepShown(0, target, 1000, 0);
  near(a, b, 1e-9);
});

test("멈춘 동안 저절로 밀기 — 다음 단계 직전(next − 0.01)까지만", () => {
  const target = { value: 0.85, next: 0.9 };
  let shown = 0.85;
  shown = stepShown(shown, target, 1000, 0);
  near(shown, 0.85 + CUTOUT_LOADING.creepPerSec);
  for (let i = 0; i < 100; i++) shown = stepShown(shown, target, 1000, 0);
  near(shown, 0.89);
});

test("선 길이는 줄지 않는다 — 진행률이 처음 와서 가짜 곡선보다 낮아도", () => {
  const fake = stepShown(0, null, 200, 5000);
  near(fake, fakeProgress(5000));
  const after = stepShown(fake, { value: 0.1, next: 0.8 }, 200, 5200);
  assert.ok(after >= fake);
});

test("알약 — 1.5초 전엔 없음, 그 뒤 문구, 처음이면 4초 뒤 바뀜", () => {
  const base = { saveQueued: false, firstTime: true, percent: null };
  assert.equal(pillText({ ...base, elapsedMs: 1000 }), null);
  assert.deepEqual(pillText({ ...base, elapsedMs: 2000 }), { text: "배경을 지우는 중", percent: null });
  assert.equal(pillText({ ...base, elapsedMs: 5000 }).text, "처음 한 번만 조금 오래 걸려요");
  assert.equal(pillText({ ...base, firstTime: false, elapsedMs: 5000 }).text, "배경을 지우는 중");
});

test("알약 — 저장 대기는 바로 뜨고, % 는 알 때만 · 99 까지", () => {
  assert.deepEqual(pillText({ elapsedMs: 100, saveQueued: true, firstTime: true, percent: 0.416 }), {
    text: "다 지우면 바로 넘어가요",
    percent: "41%",
  });
  assert.equal(pillText({ elapsedMs: 9000, saveQueued: false, firstTime: false, percent: 1 }).percent, "99%");
  const noPercent = { ...CUTOUT_LOADING, showPercent: false };
  assert.equal(pillText({ elapsedMs: 9000, saveQueued: false, firstTime: false, percent: 0.5, values: noPercent }).percent, null);
});

test("저장 대기 뒤 기다리는 시간 — 닫힘 + 빠른 걷힘 + 머묾 / 움직임 줄이기", () => {
  const v = CUTOUT_LOADING;
  near(saveWaitMs(false), v.close + v.reveal * v.saveRevealScale + v.saveHold);
  near(saveWaitMs(true), v.reducedFade + v.saveHold);
});

test("테두리 모양 — 안쪽 inset 에서 시작해 닫힌다", () => {
  const d = borderPath(366, 6);
  assert.ok(d.startsWith("M15 6 "));
  assert.ok(d.includes("H351"));
  assert.ok(d.endsWith("Z"));
});
