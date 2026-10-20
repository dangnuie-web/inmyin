// 에디터 틀 계산 시험. npm run test:template
// node 22.18 이상은 .ts 파일의 타입을 지우고 바로 불러온다
import { test } from "node:test";
import assert from "node:assert/strict";
import { arrange, detachObject, emptySlots, fitInSlot, listColumns, placeText, templateLayout, TEMPLATE_IDS, TEMPLATE_NUMBERS } from "./templates.ts";

const W = 1080;
const H = 1350;
const context = { inventory: "매일 드는 파우치", handle: "momo" };

function item(n, extra = {}) {
  return { id: `o${n}`, kind: "item", itemId: `i${n}`, src: `/x/${n}.png`, x: 0, y: 0, width: 400, height: 300, rotation: 0, ...extra };
}
function sticker(n) {
  return { id: `s${n}`, kind: "sticker", src: `/s/${n}.png`, x: 10, y: 10, width: 100, height: 100, rotation: 0 };
}
let counter = 0;
const arrangeContext = {
  ...context,
  nameOf: (itemId) => `이름 ${itemId}`,
  extentOf: () => ({ width: 640, height: 480, bbox: { x: 120, y: 90, width: 400, height: 300 } }),
  measure: (spec) => spec.text.length * spec.fontSize * 0.5,
  newId: () => `t${++counter}`,
};
const fresh = (id) => ({ id, detached: [] });

test("자리 수는 개수만큼, 한도까지", () => {
  for (const id of TEMPLATE_IDS) {
    const cap = TEMPLATE_NUMBERS[id].capacity;
    for (let n = 0; n <= cap + 3; n++) assert.equal(templateLayout(id, n, context).slots.length, Math.min(n, cap), `${id} ${n}`);
  }
});

test("모든 자리가 캔버스 안에 있다", () => {
  for (const id of TEMPLATE_IDS) {
    for (let n = 1; n <= TEMPLATE_NUMBERS[id].capacity; n++) {
      for (const slot of templateLayout(id, n, context).slots) {
        assert.ok(slot.x >= 0 && slot.y >= 0 && slot.x + slot.width <= W && slot.y + slot.height <= H, `${id} ${n} ${JSON.stringify(slot)}`);
        assert.ok(slot.width > 0 && slot.height > 0, `${id} ${n} 크기`);
      }
    }
  }
});

test("A — 가방은 아래 큰 자리 · 맨 앞, 나머지는 위로 솟고 바깥으로 기욺", () => {
  const layout = templateLayout("A", 7, context);
  assert.equal(layout.front, 0);
  assert.deepEqual({ ...layout.slots[0], rotation: undefined, align: undefined }, { ...TEMPLATE_NUMBERS.A.hero, rotation: undefined, align: undefined });
  assert.equal(layout.slots[0].align, "bottom");
  for (const slot of layout.slots.slice(1)) {
    const cx = slot.x + slot.width / 2;
    assert.ok(slot.y + slot.height / 2 < TEMPLATE_NUMBERS.A.fan.y, "부채는 중심보다 위");
    assert.ok(Math.sign(slot.rotation) === Math.sign(cx - 540) || Math.abs(cx - 540) < 1, "바깥으로 기욺");
  }
  // 나머지 하나면 가운데 위
  const one = templateLayout("A", 2, context).slots[1];
  assert.ok(Math.abs(one.x + one.width / 2 - 540) < 0.001);
  assert.equal(one.rotation, 0);
});

test("A — 글자: What's in my bag + 둘째 줄 인벤토리 이름", () => {
  const texts = templateLayout("A", 3, context).texts;
  assert.deepEqual(texts.map((t) => [t.key, t.text]), [["title", "What's in my bag"], ["subtitle", "매일 드는 파우치"]]);
  // 인벤토리 이름이 없으면 둘째 줄을 쓰지 않는다
  assert.equal(templateLayout("A", 3, { inventory: "", handle: "momo" }).texts.length, 1);
});

test("A — 6~9개는 두 줄 부채 (설계서 3절 · 데모 게시물과 같은 좌표)", () => {
  const slots = templateLayout("A", 10, context).slots.slice(1);
  assert.equal(slots.length, 9);
  // 안쪽 floor(0.4 × 9) = 3 개는 210, 바깥 6 개는 195
  assert.deepEqual(slots.map((s) => Math.round(s.width)), [210, 210, 210, 195, 195, 195, 195, 195, 195]);
});

test("B — 열 수 규칙과 마지막 줄 왼쪽부터", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 9, 10, 16].map(listColumns), [1, 2, 2, 2, 3, 3, 4, 4]);
  const slots = templateLayout("B", 5, context).slots;
  // 3열 — 4번째(두 번째 줄 첫 칸)는 첫 칸과 같은 x
  assert.equal(slots[3].x, slots[0].x);
  assert.ok(slots[3].y > slots[0].y);
  // 같은 줄은 밑선이 같다
  assert.equal(slots[0].y + slots[0].height, slots[2].y + slots[2].height);
});

test("B — 이름 · 번호 · 개수 글자", () => {
  const items = [{ objectId: "a", name: "쿠션 팩트" }, { objectId: "b", name: "립 틴트" }];
  const texts = templateLayout("B", 2, context, items).texts;
  assert.deepEqual(
    texts.map((t) => [t.key, t.text, t.anchor]),
    [["title", "매일 드는 파우치", "left"], ["count", "아이템 2", "right"], ["label:a", "쿠션 팩트", "center"], ["number:a", "01", "left"], ["label:b", "립 틴트", "center"], ["number:b", "02", "left"]],
  );
  // 아이템이 없으면 "아이템 0" 은 안 쓴다
  assert.deepEqual(templateLayout("B", 0, context).texts.map((t) => t.key), ["title"]);
});

test("fitInSlot — 보이는 물건이 상자에 맞고 아래 정렬이면 바닥에 붙음", () => {
  const image = { width: 640, height: 480, bbox: { x: 120, y: 90, width: 400, height: 300 } };
  const slot = { x: 100, y: 100, width: 200, height: 400, rotation: 0, align: "bottom" };
  const place = fitInSlot(image, slot);
  const s = 200 / 400;
  assert.equal(place.width, 640 * s);
  // 보이는 부분의 바닥 = 상자 바닥
  assert.equal(place.y + (90 + 300) * s, 500);
  assert.equal(place.x + 120 * s, 100);
  // 돌려도 보이는 물건의 가운데는 제자리
  const turned = fitInSlot(image, { ...slot, align: "center", rotation: 30 });
  const local = { x: (120 + 200) * s, y: (90 + 150) * s };
  const r = (30 * Math.PI) / 180;
  const center = { x: turned.x + local.x * Math.cos(r) - local.y * Math.sin(r), y: turned.y + local.x * Math.sin(r) + local.y * Math.cos(r) };
  assert.ok(Math.abs(center.x - 200) < 1e-9 && Math.abs(center.y - 300) < 1e-9);
});

test("placeText — 가운데 · 왼쪽 끝 · 오른쪽 끝", () => {
  assert.deepEqual(placeText({ ax: 500, ay: 100, anchor: "center" }, 200, 40), { x: 400, y: 80 });
  assert.deepEqual(placeText({ ax: 80, ay: 100, anchor: "left" }, 200, 40), { x: 80, y: 80 });
  assert.deepEqual(placeText({ ax: 1000, ay: 100, anchor: "right" }, 200, 40), { x: 800, y: 80 });
});

test("arrange — 처음 고르면 올린 아이템을 모두 자리로, 순서는 올린 순", () => {
  const objects = [item(1), sticker(1), item(2), item(3)];
  const { objects: out, overflow } = arrange(fresh("A"), objects, arrangeContext, { gatherAll: true });
  assert.equal(overflow, 0);
  const items = out.filter((o) => o.kind === "item");
  assert.deepEqual(items.map((o) => [o.id, o.template.slot]).sort(), [["o1", 0], ["o2", 1], ["o3", 2]]);
  // 가방(첫 아이템)이 아이템 중 맨 앞(나중에 그림), 스티커는 틀 묶음보다 앞에 있던 대로 뒤에
  const order = out.map((o) => o.id);
  assert.ok(order.indexOf("o1") > order.indexOf("o2") && order.indexOf("o1") > order.indexOf("o3"));
  assert.ok(order.indexOf("s1") > order.indexOf("o1"), "스티커는 틀 묶음 위 그대로");
  // 글자 둘
  assert.deepEqual(out.filter((o) => o.kind === "text").map((o) => o.text), ["What's in my bag", "매일 드는 파우치"]);
});

test("arrange — 넘친 아이템은 가운데, 개수를 알려 줌", () => {
  const objects = Array.from({ length: 13 }, (_, i) => item(i + 1));
  const { objects: out, overflow } = arrange(fresh("A"), objects, arrangeContext, { gatherAll: true });
  assert.equal(overflow, 3);
  const extra = out.filter((o) => o.kind === "item" && o.template.slot >= 10);
  assert.equal(extra.length, 3);
  // 첫 넘친 것은 정가운데
  assert.ok(Math.abs(extra[0].x + extra[0].width / 2 - 540) < 1e-9 && Math.abs(extra[0].y + extra[0].height / 2 - 675) < 1e-9);
});

test("arrange — 손으로 옮긴 것(틀 표시 없음)은 틀을 바꿔도 그대로", () => {
  const first = arrange(fresh("B"), [item(1), item(2), item(3)], arrangeContext, { gatherAll: true }).objects;
  const moved = first.map((o) => (o.id === "o2" ? detachObject({ ...o, x: 5, y: 6 }, fresh("B")).object : o));
  const second = arrange(fresh("A"), moved, arrangeContext).objects;
  const o2 = second.find((o) => o.id === "o2");
  assert.equal(o2.x, 5);
  assert.equal(o2.template, undefined);
  // 나머지 둘이 가방 + 하나로
  assert.deepEqual(second.filter((o) => o.template?.role === "item").map((o) => [o.id, o.template.slot]).sort(), [["o1", 0], ["o3", 1]]);
  // B 의 이름 · 번호 글자는 사라지고 A 글자만
  assert.deepEqual(second.filter((o) => o.kind === "text").map((o) => o.template.key), ["title", "subtitle"]);
});

test("arrange — 지우면 뒤 아이템이 당겨지고 이름 · 번호도 따라감", () => {
  const first = arrange(fresh("B"), [item(1), item(2), item(3)], arrangeContext, { gatherAll: true }).objects;
  const removed = first.filter((o) => o.id !== "o1");
  const out = arrange(fresh("B"), removed, arrangeContext).objects;
  assert.deepEqual(out.filter((o) => o.kind === "item").map((o) => [o.id, o.template.slot]), [["o2", 0], ["o3", 1]]);
  const texts = out.filter((o) => o.kind === "text").map((o) => [o.template.key, o.text]);
  assert.deepEqual(texts, [["title", "매일 드는 파우치"], ["count", "아이템 2"], ["label:o2", "이름 i2"], ["number:o2", "01"], ["label:o3", "이름 i3"], ["number:o3", "02"]]);
});

test("arrange — 사용자가 손댄 글자(detached)는 다시 쓰지 않음, 글자 id 는 이어 감", () => {
  const first = arrange(fresh("A"), [item(1)], arrangeContext, { gatherAll: true }).objects;
  const title = first.find((o) => o.template?.key === "title");
  const { object, template } = detachObject({ ...title, text: "내 가방" }, fresh("A"));
  assert.deepEqual(template.detached, ["title"]);
  const next = first.map((o) => (o.id === title.id ? object : o)).concat(item(2));
  const out = arrange(template, next.map((o) => (o.id === "o2" ? { ...o, template: { role: "item", slot: 99 } } : o)), arrangeContext).objects;
  const texts = out.filter((o) => o.kind === "text");
  assert.equal(texts.filter((o) => o.text === "What's in my bag").length, 0);
  assert.equal(texts.filter((o) => o.text === "내 가방").length, 1);
  const subtitleBefore = first.find((o) => o.template?.key === "subtitle");
  assert.equal(out.find((o) => o.template?.key === "subtitle").id, subtitleBefore.id);
});

test("emptySlots — 틀만 고르고 아이템이 없으면 미리 보기 개수, 하나라도 들면 없음", () => {
  assert.equal(emptySlots(null, []).length, 0);
  assert.equal(emptySlots(fresh("A"), []).length, TEMPLATE_NUMBERS.A.preview);
  assert.equal(emptySlots(fresh("B"), [sticker(1)]).length, TEMPLATE_NUMBERS.B.preview);
  assert.equal(emptySlots(fresh("B"), [item(1, { template: { role: "item", slot: 0 } })]).length, 0);
});
