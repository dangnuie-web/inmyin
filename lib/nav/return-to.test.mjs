// "온 곳으로 돌아가기" 주소 규칙 시험 (2026-10-21 당니님 결정 ③④). npm run test:nav
import { test } from "node:test";
import assert from "node:assert/strict";
import { returnToFrom, safeReturnTo, withReturnTo } from "./return-to.ts";

const INV = "/my/inventories/11111111-1111-4111-8111-111111111111";

test("이 사이트 안의 경로만 받는다", () => {
  assert.equal(safeReturnTo(INV), INV);
  assert.equal(safeReturnTo("/my?view=list"), "/my?view=list");
  assert.equal(safeReturnTo("/my/items"), "/my/items");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "evil.com", "", " /my", "/my\n", "/my\tx", null, undefined, 3, ["/my"]]) {
    assert.equal(safeReturnTo(bad), null, String(bad));
  }
  assert.equal(safeReturnTo("/" + "a".repeat(400)), null);
});

test("돌아갈 곳에 실린 back 은 뺀다 — 한 칸만", () => {
  assert.equal(safeReturnTo("/my/plan?back=%2Fmy"), "/my/plan");
  assert.equal(safeReturnTo("/my?view=list&back=%2Fx"), "/my?view=list");
});

test("주소에 싣기 — 기존 쿼리는 그대로, 못 믿으면 안 싣는다", () => {
  assert.equal(withReturnTo("/my/inventories/new", INV), `/my/inventories/new?back=${encodeURIComponent(INV)}`);
  assert.equal(withReturnTo("/my/inventories/new", "/my?view=list"), "/my/inventories/new?back=%2Fmy%3Fview%3Dlist");
  assert.equal(withReturnTo("/x?a=1", "/my"), "/x?a=1&back=%2Fmy");
  assert.equal(withReturnTo("/x", "//evil.com"), "/x");
  assert.equal(withReturnTo("/x", null), "/x");
});

test("싣고 꺼내면 같은 곳 — 띠 + 칸 → 촬영 → 편집 → 만들기까지 그대로 건너간다", () => {
  let href = withReturnTo("/my/inventories/new/camera", "/my?view=list&category=가방");
  for (const next of ["/my/inventories/new/edit", "/my/inventories/new"]) {
    const back = returnToFrom(Object.fromEntries(new URL(href, "https://x.invalid").searchParams));
    href = withReturnTo(next, back);
  }
  const back = returnToFrom(Object.fromEntries(new URL(href, "https://x.invalid").searchParams));
  assert.equal(back, "/my?view=list&category=%EA%B0%80%EB%B0%A9");
});

test("searchParams 에서 꺼내기", () => {
  assert.equal(returnToFrom({ back: INV }), INV);
  assert.equal(returnToFrom({ back: [INV, "/x"] }), INV);
  assert.equal(returnToFrom({ back: "https://evil.com" }), null);
  assert.equal(returnToFrom({}), null);
});
