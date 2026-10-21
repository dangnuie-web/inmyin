// 덮는 판 · 뒤로 가기 규칙 시험 (2026-10-21 당니님 결정 "누끼 손질 중 뒤로 가기 → 손질만 닫기"). npm run test:history
import { test } from "node:test";
import assert from "node:assert/strict";
import { closeBy, layerOf, layerState, LAYER_KEY, onLayerPop } from "./layer.ts";

// Next 가 적어 두는 state 를 흉내 — 판 표식은 그 옆에 붙는다
const base = { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: {} };
const retouch = { ...base, ...layerState("retouch") };

test("판 이름 읽기 — 표식이 없거나 모양이 다르면 null", () => {
  assert.equal(layerOf(retouch), "retouch");
  assert.equal(layerOf(base), null);
  assert.equal(layerOf(null), null);
  assert.equal(layerOf("retouch"), null);
  assert.equal(layerOf({ [LAYER_KEY]: 3 }), null);
});

test("열고 뒤로 가기 → 판만 닫힌다", () => {
  // 뒤로 가기로 판 칸에서 아래 칸(사진 편집)으로 내려왔다
  assert.equal(onLayerPop(base, "retouch", true), "close");
});

test("닫기 버튼 → back 으로 칸을 빼고, 그 popstate 가 닫는다 — 한 번만", () => {
  assert.equal(closeBy(retouch, "retouch"), "back");
  assert.equal(onLayerPop(base, "retouch", true), "close");
  // 닫힌 뒤 한 번 더 뒤로 가기 → 판과 상관없는 이동(사진 편집을 떠난다). 판을 다시 열지 않는다
  assert.equal(onLayerPop(base, "retouch", false), "none");
});

test("닫힌 뒤 앞으로 가기로 판 칸에 오면 한 칸 더 뒤로 — 빈 칸에서 헛돌지 않게", () => {
  assert.equal(onLayerPop(retouch, "retouch", false), "skip");
});

test("판 칸에 있지 않으면(쌓기 실패 · 다른 판) 바로 닫는다", () => {
  assert.equal(closeBy(base, "retouch"), "direct");
  assert.equal(closeBy({ ...base, ...layerState("other") }, "retouch"), "direct");
  // 다른 판 칸은 이 판이 건드리지 않는다
  assert.equal(onLayerPop({ ...base, ...layerState("other") }, "retouch", false), "none");
});

test("열린 채 판 칸에 그대로 있는 popstate(해시 이동 등)는 무시", () => {
  assert.equal(onLayerPop(retouch, "retouch", true), "none");
});
