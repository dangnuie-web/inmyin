// 칩 글자색이 바탕에서 읽히는지 (오피스 로드맵 3단계 "어두운 수정 화면의 고른 칩이 검정이라 안 보임"). npm run test:inventory
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CATEGORY_TAG_BACKGROUNDS, CATEGORY_TAG_TEXT_TONES } from "./category-tag-tone.ts";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

// globals.css 의 --color-이름 값을 따라가 hex 로 (var(...) 는 한 단계씩 풀어 간다)
function hexOf(name) {
  const match = css.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  assert.ok(match, `--color-${name} 이 없음`);
  const value = match[1].trim();
  const alias = value.match(/^var\(--color-([\w-]+)\)$/);
  return alias ? hexOf(alias[1]) : value;
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const textColor = (classes) => classes.match(/text-([\w-]+)/)[1];

for (const [tone, { selected, plain }] of Object.entries(CATEGORY_TAG_TEXT_TONES)) {
  const background = hexOf(CATEGORY_TAG_BACKGROUNDS[tone]);
  test(`${tone} — 고른 칩 글자는 바탕과 명암비 4.5 이상 (WCAG AA)`, () => {
    assert.ok(contrast(hexOf(textColor(selected)), background) >= 4.5);
  });
  test(`${tone} — 안 고른 칩도 바탕에서 읽힌다 (명암비 3 이상), 고른 것과 굵기가 다르다`, () => {
    assert.ok(contrast(hexOf(textColor(plain)), background) >= 3);
    assert.notEqual(selected.match(/font-\w+/)[0], plain.match(/font-\w+/)[0]);
  });
}

test("어두운 화면의 칩은 tone=dark — 아이템 정보 입력 · 수정 폼", () => {
  const form = readFileSync(new URL("../components/item/ItemForm.tsx", import.meta.url), "utf8");
  for (const line of form.split("\n").filter((l) => l.includes("<CategoryTag") && !l.includes("onRemove"))) assert.match(line, /tone="dark"/);
});
