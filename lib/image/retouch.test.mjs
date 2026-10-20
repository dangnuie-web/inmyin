// 누끼 손질 계산 시험. npm run test:image
import { test } from "node:test";
import assert from "node:assert/strict";
import { clampView, pinchView, stamp, strokePoints, unionRect } from "./retouch.ts";

const W = 20;
const H = 20;

function solid(r, g, b, a) {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < data.length; i += 4) data.set([r, g, b, a], i);
  return data;
}
const at = (data, x, y) => Array.from(data.slice((y * W + x) * 4, (y * W + x) * 4 + 4));

test("지우개 — 붓 가운데는 투명, 바깥은 그대로, 색은 안 건드림", () => {
  const work = solid(200, 100, 50, 255);
  const original = solid(1, 2, 3, 255);
  const rect = stamp(work, original, W, H, 10, 10, 4, "erase");
  assert.deepEqual(at(work, 10, 10), [200, 100, 50, 0]);
  assert.deepEqual(at(work, 0, 0), [200, 100, 50, 255]);
  assert.deepEqual(rect, { x: 6, y: 6, width: 9, height: 9 });
});

test("가장자리는 부드럽게 — 가운데에서 멀수록 덜 지운다", () => {
  const work = solid(0, 0, 0, 255);
  stamp(work, work.slice(), W, H, 10, 10, 6, "erase");
  const center = at(work, 9, 9)[3];
  const edge = at(work, 14, 9)[3];
  assert.equal(center, 0);
  assert.ok(edge > 0 && edge < 255, `가장자리 알파 ${edge}`);
});

test("되살리기 — 지운 자리에 원래 사진의 색이 돌아온다", () => {
  const work = solid(0, 0, 0, 0);
  const original = solid(10, 20, 30, 255);
  stamp(work, original, W, H, 5, 5, 3, "restore");
  assert.deepEqual(at(work, 5, 5), [10, 20, 30, 255]);
  // 붓 밖은 그대로 투명
  assert.deepEqual(at(work, 15, 15), [0, 0, 0, 0]);
});

test("되살리기는 이미 남아 있는 물건을 원래 색으로 덮어쓰지 않는다 (알파가 더 클 때만)", () => {
  const work = solid(90, 90, 90, 255);
  const original = solid(10, 20, 30, 255);
  stamp(work, original, W, H, 10, 10, 4, "restore");
  assert.deepEqual(at(work, 10, 10), [90, 90, 90, 255]);
});

test("지웠다 되살리면 원래 사진으로 돌아온다", () => {
  const original = solid(10, 20, 30, 255);
  const work = original.slice();
  stamp(work, original, W, H, 10, 10, 5, "erase");
  stamp(work, original, W, H, 10, 10, 5, "restore");
  assert.deepEqual(at(work, 10, 10), [10, 20, 30, 255]);
});

test("사진 밖에 찍으면 아무것도 안 한다", () => {
  const work = solid(1, 1, 1, 255);
  assert.equal(stamp(work, work.slice(), W, H, -50, -50, 3, "erase"), null);
  // 걸치면 안쪽만
  const rect = stamp(work, work.slice(), W, H, 0, 0, 3, "erase");
  assert.equal(rect.x, 0);
  assert.equal(rect.y, 0);
});

test("선 잇기 — 빨리 그어도 반지름 1/4 간격으로 끊기지 않는다", () => {
  const points = strokePoints(0, 0, 100, 0, 8);
  assert.equal(points.length, 50);
  assert.deepEqual(points.at(-1), [100, 0]);
  for (let k = 1; k < points.length; k += 1) assert.ok(points[k][0] - points[k - 1][0] <= 2.0001);
  // 제자리면 한 번
  assert.equal(strokePoints(5, 5, 5, 5, 8).length, 1);
});

test("범위 합치기", () => {
  assert.deepEqual(unionRect(null, { x: 1, y: 1, width: 2, height: 2 }), { x: 1, y: 1, width: 2, height: 2 });
  assert.deepEqual(unionRect({ x: 0, y: 0, width: 2, height: 2 }, { x: 5, y: 1, width: 1, height: 4 }), { x: 0, y: 0, width: 6, height: 5 });
});

test("두 손가락 확대 — 손가락 가운데 아래의 점이 그대로 남는다", () => {
  const start = { scale: 1, x: 0, y: 0 };
  const v = pinchView(start, [100, 100], 50, [100, 100], 100);
  assert.equal(v.scale, 2);
  // 사진 위 (100,100) 점은 배율 2 에서도 (100,100) 에
  assert.equal(100 * v.scale + v.x, 100 * 1 + 0 + (100 - 100));
  assert.deepEqual({ x: v.x, y: v.y }, { x: -100, y: -100 });
  // 이동만
  const moved = pinchView(start, [100, 100], 50, [130, 90], 50);
  assert.deepEqual(moved, { scale: 1, x: 30, y: -10 });
  // 1 아래 · 8 위로는 안 간다
  assert.equal(pinchView(start, [0, 0], 100, [0, 0], 10).scale, 1);
  assert.equal(pinchView(start, [0, 0], 10, [0, 0], 1000).scale, 8);
});

test("확대한 사진이 화면 밖으로 달아나지 않는다", () => {
  // 화면 300×300 에 사진 300×300, 배율 1 이면 언제나 가운데
  assert.deepEqual(clampView({ scale: 1, x: 80, y: -40 }, 300, 300, 300, 300), { scale: 1, x: 0, y: 0 });
  // 배율 2 (600) — 왼쪽 위 끝은 0 을 넘어 들어오지 않고, 오른쪽 아래 끝은 -300 을 넘지 않는다
  assert.deepEqual(clampView({ scale: 2, x: 50, y: 50 }, 300, 300, 300, 300), { scale: 2, x: 0, y: 0 });
  assert.deepEqual(clampView({ scale: 2, x: -900, y: -100 }, 300, 300, 300, 300), { scale: 2, x: -300, y: -100 });
});
