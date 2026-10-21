// 고정 카테고리 8개 · 추천 프리셋 시험 (오피스 로드맵 3단계 "카테고리 고정 8개"). npm run test:inventory
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FIXED_CATEGORIES, isFixedCategory, MAX_CATEGORIES, MAX_CATEGORY_LENGTH, RECOMMENDED_INVENTORIES } from "./categories.ts";
import { FIXED_CATEGORIES as DEMO_FIXED } from "../scripts/demo/lib.mjs";

const DECIDED = ["가방", "데스크", "파우치", "옷장", "굿즈·수집", "취미", "집·주방", "여행·아웃도어"];

test("고정 카테고리는 당니님이 정한 8개, 그 글자 · 그 순서", () => {
  assert.deepEqual([...FIXED_CATEGORIES], DECIDED);
});

test("DB 제약 · 데모 도구의 목록이 앱과 같다", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261021100000_inventory_fixed_category.sql", import.meta.url), "utf8");
  const inList = sql.match(/category in \(([^)]*)\)/)[1].split(",").map((part) => part.trim().replace(/^'|'$/g, ""));
  assert.deepEqual(inList, DECIDED);
  assert.deepEqual(DEMO_FIXED, DECIDED);
});

test("isFixedCategory — 8개만 통과, 자유 태그 · 빈 값 · 배열은 아님", () => {
  for (const category of DECIDED) assert.equal(isFixedCategory(category), true);
  for (const value of ["상의", "굿즈", "집", "", " 가방", null, undefined, ["가방"], 3]) assert.equal(isFixedCategory(value), false, String(value));
});

test("추천 프리셋 — 가방 · 데스크 · 파우치 · 굿즈가 있고, 저마다 고정 카테고리를 고른다", () => {
  const names = RECOMMENDED_INVENTORIES.map((preset) => preset.name);
  for (const name of ["가방", "데스크", "파우치", "굿즈", "옷장", "냉장고", "집", "생활용품"]) assert.ok(names.includes(name), name);
  assert.equal(new Set(names).size, names.length);
  for (const preset of RECOMMENDED_INVENTORIES) assert.ok(isFixedCategory(preset.category), preset.name);
  assert.equal(RECOMMENDED_INVENTORIES.find((preset) => preset.name === "굿즈").category, "굿즈·수집");
});

test("추천 프리셋의 태그는 태그 규칙(10개 · 10자 · 중복 · 앞뒤 공백)을 지킨다", () => {
  for (const preset of RECOMMENDED_INVENTORIES) {
    assert.ok(preset.categories.length <= MAX_CATEGORIES, preset.name);
    assert.equal(new Set(preset.categories).size, preset.categories.length, preset.name);
    for (const tag of preset.categories) {
      assert.ok(tag.length >= 1 && tag.length <= MAX_CATEGORY_LENGTH, tag);
      assert.equal(tag, tag.trim());
    }
  }
});
