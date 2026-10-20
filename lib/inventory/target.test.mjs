// 넣을 인벤토리 기본값 시험 (무늬 인벤토리고르기설계 v01 3절). npm run test:inventory
import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseTarget, fallbackInventory, hasRoom, inventoriesByCategory } from "./target.ts";

const inv = (id, usedSlots, createdAt, slotCount = 25) => ({ id, usedSlots, slotCount, createdAt });
const item = (inventoryId, category, createdAt) => ({ inventoryId, category, createdAt });

const desk = inv("desk", 12, "2026-10-01");
const bag = inv("bag", 7, "2026-10-05");
const home = inv("home", 25, "2026-10-03"); // 꽉 참
const pouch = inv("pouch", 3, "2026-10-04");
const all = [desk, bag, home, pouch];

const items = [
  item("desk", "집", "2026-10-10"),
  item("pouch", "집", "2026-10-11"),
  item("pouch", "집", "2026-10-12"),
  item("home", "집", "2026-10-09"),
  item("home", "집", "2026-10-08"),
  item("home", "집", "2026-10-07"),
  item("bag", "옷", "2026-10-13"),
];

test("빈 칸 있음", () => {
  assert.equal(hasRoom(desk), true);
  assert.equal(hasRoom(home), false);
});

test("1순위 — 인벤토리 안의 + 는 그 인벤토리", () => {
  assert.equal(chooseTarget({ inventories: all, items, preferredId: "desk", category: "옷", rememberedId: "bag" }), "desk");
});

test("인벤토리 안이 꽉 찼으면 다음 순서로", () => {
  assert.equal(chooseTarget({ inventories: all, items, preferredId: "home", rememberedId: "bag" }), "bag");
});

test("카테고리 — 그 카테고리 아이템이 가장 많은 곳, 꽉 찬 곳은 건너뜀", () => {
  // 집: home 3(꽉 참) · pouch 2 · desk 1
  assert.deepEqual(inventoriesByCategory(items, "집"), ["home", "pouch", "desk"]);
  assert.equal(chooseTarget({ inventories: all, items, category: "집", rememberedId: "bag" }), "pouch");
});

test("카테고리 개수가 같으면 그 카테고리를 가장 최근에 넣은 곳", () => {
  const tie = [item("desk", "책", "2026-10-01"), item("bag", "책", "2026-10-02")];
  assert.deepEqual(inventoriesByCategory(tie, "책"), ["bag", "desk"]);
});

test("카테고리 아이템이 모두 꽉 찬 곳에 있으면 쿠키로", () => {
  const onlyHome = [item("home", "주방", "2026-10-01")];
  assert.equal(chooseTarget({ inventories: all, items: onlyHome, category: "주방", rememberedId: "desk" }), "desk");
});

test("모르는 카테고리면 쿠키로", () => {
  assert.equal(chooseTarget({ inventories: all, items, category: "없는것", rememberedId: "desk" }), "desk");
});

test("쿠키 — 하단 탭 + 의 기본", () => {
  assert.equal(chooseTarget({ inventories: all, items, rememberedId: "desk" }), "desk");
});

test("쿠키가 꽉 찼거나 내 것이 아니면 최근에 아이템을 넣은 곳", () => {
  assert.equal(chooseTarget({ inventories: all, items, rememberedId: "home" }), "bag");
  assert.equal(chooseTarget({ inventories: all, items, rememberedId: "someone-else" }), "bag");
});

test("최근에 넣은 곳이 꽉 찼으면 그다음 최근에 넣은 곳", () => {
  const recentFull = [item("home", null, "2026-10-20"), item("desk", null, "2026-10-19")];
  assert.equal(chooseTarget({ inventories: all, items: recentFull }), "desk");
});

test("아이템이 없으면 최근 만든, 빈 칸 있는 곳", () => {
  assert.equal(chooseTarget({ inventories: all, items: [] }), "bag");
  assert.equal(chooseTarget({ inventories: [desk, home], items: [] }), "desk");
});

test("모두 꽉 참 · 인벤토리 없음이면 null", () => {
  const full = [inv("a", 25, "2026-10-01"), inv("b", 50, "2026-10-02", 50)];
  assert.equal(chooseTarget({ inventories: full, items: [], preferredId: "a", rememberedId: "b" }), null);
  assert.equal(chooseTarget({ inventories: [], items: [] }), null);
});

test("모두 꽉 찼을 때 데려갈 곳 — 쿠키 > 최근 넣은 곳 > 최근 만든 곳", () => {
  const full = [inv("a", 25, "2026-10-01"), inv("b", 25, "2026-10-02")];
  assert.equal(fallbackInventory({ inventories: full, items: [], rememberedId: "a" }), "a");
  assert.equal(fallbackInventory({ inventories: full, items: [item("a", null, "2026-10-05")], rememberedId: "x" }), "a");
  assert.equal(fallbackInventory({ inventories: full, items: [] }), "b");
  assert.equal(fallbackInventory({ inventories: [], items: [] }), null);
});
