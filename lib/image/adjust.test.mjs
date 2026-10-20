// 사진 색 보정 계산 시험. npm run test:image
// node 22.18 이상은 .ts 파일의 타입을 지우고 바로 불러온다
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyze,
  applyLuts,
  autoAdjust,
  buildLuts,
  isIdentity,
  meanLuma,
  nextDarkState,
  NO_AUTO,
  NO_MANUAL,
  percentile,
} from "./adjust.ts";

// 한 색으로 칠한 n 개 픽셀 + 다른 색 픽셀들을 섞은 사진
function photo(parts) {
  const total = parts.reduce((sum, [n]) => sum + n, 0);
  const data = new Uint8ClampedArray(total * 4);
  let p = 0;
  for (const [n, [r, g, b, a = 255]] of parts) {
    for (let k = 0; k < n; k += 1, p += 1) data.set([r, g, b, a], p * 4);
  }
  return data;
}

// 0 ~ 255 를 고르게 깐 회색 그러데이션을 range 안으로 눌러 담은 사진
function gradient(from, to, n = 4096, tint = [0, 0, 0]) {
  const data = new Uint8ClampedArray(n * 4);
  for (let p = 0; p < n; p += 1) {
    const v = from + ((to - from) * p) / (n - 1);
    data.set([v + tint[0], v + tint[1], v + tint[2], 255], p * 4);
  }
  return data;
}

function channelMeans(data) {
  const sum = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    sum[0] += data[i];
    sum[1] += data[i + 1];
    sum[2] += data[i + 2];
    n += 1;
  }
  return sum.map((s) => s / n);
}

function correct(data, manual = NO_MANUAL) {
  return applyLuts(data, buildLuts(autoAdjust(analyze(data)), manual));
}

test("보정이 없으면 표는 그대로(0→0, 255→255)", () => {
  const luts = buildLuts(NO_AUTO, NO_MANUAL);
  for (const lut of luts) for (let v = 0; v < 256; v += 1) assert.equal(lut[v], v);
  assert.ok(isIdentity(null, NO_MANUAL));
  assert.ok(!isIdentity(null, { ...NO_MANUAL, tint: 5 }));
  assert.ok(!isIdentity(NO_AUTO, NO_MANUAL));
});

test("백분위 — 아래에서 센 자리의 밝기", () => {
  const h = new Uint32Array(256);
  h[10] = 50;
  h[200] = 50;
  assert.equal(percentile(h, 0.25), 10);
  assert.equal(percentile(h, 0.75), 200);
  assert.equal(percentile(new Uint32Array(256), 0.5), 0);
});

test("어두운 사진은 자동 보정 뒤 더 밝아지고 폭이 넓어진다", () => {
  const dark = gradient(5, 90);
  const before = analyze(dark);
  const after = analyze(correct(dark));
  assert.ok(after.meanLuma > before.meanLuma + 40, `${before.meanLuma} → ${after.meanLuma}`);
  // 밝은 끝은 펴지지만 끝까지 하얗게는 안 편다 — 흰 점 하한 170 (원래 어두운 장면을 회색으로 띄우지 않게)
  assert.ok(percentile(after.histogram, 0.995) >= 170);
  assert.ok(percentile(after.histogram, 0.005) <= 10);
});

test("이미 고른 사진은 크게 바뀌지 않는다", () => {
  const ok = gradient(0, 255);
  const before = analyze(ok).meanLuma;
  const after = analyze(correct(ok)).meanLuma;
  assert.ok(Math.abs(after - before) < 12, `${before} → ${after}`);
});

test("흰 바탕 사진을 회색으로 가라앉히지 않는다", () => {
  const white = photo([
    [9000, [245, 245, 245]],
    [1000, [40, 60, 160]],
  ]);
  const out = correct(white);
  // 흰 바탕 픽셀 하나
  assert.ok(out[0] >= 235, `흰 바탕 ${out[0]}`);
});

test("누런 조명(파랑이 모자란 회색)은 회색 쪽으로 돌아온다", () => {
  const yellowish = gradient(40, 200, 4096, [18, 8, -25]);
  const [r0, , b0] = channelMeans(yellowish);
  const [r1, , b1] = channelMeans(correct(yellowish));
  assert.ok(r1 - b1 < (r0 - b0) * 0.7, `R-B ${r0 - b0} → ${r1 - b1}`);
});

test("화이트밸런스는 진한 색 물건을 회색으로 바꾸지 않는다", () => {
  // 빨간 물건이 대부분 + 회색 배경 조금
  const red = photo([
    [8000, [200, 30, 30]],
    [2000, [128, 128, 128]],
  ]);
  const { gains } = autoAdjust(analyze(red));
  for (const g of gains) assert.ok(Math.abs(g - 1) < 0.05, `gains ${gains}`);
});

test("곱하는 값은 0.75 ~ 1.4 를 넘지 않는다", () => {
  const green = photo([[4000, [60, 140, 60]]]);
  const { gains } = autoAdjust(analyze(green));
  for (const g of gains) assert.ok(g >= 0.75 && g <= 1.4);
});

test("투명한 자리는 세지도 바꾸지도 않는다 (배경을 지운 사진)", () => {
  const cutout = photo([
    [5000, [0, 0, 0, 0]],
    [5000, [60, 60, 60, 255]],
  ]);
  const stats = analyze(cutout);
  assert.equal(stats.count, 5000);
  assert.ok(Math.abs(stats.meanLuma - 60) < 1);
  const out = correct(cutout, { ...NO_MANUAL, brightness: 40 });
  // 투명 픽셀의 알파는 0 그대로
  assert.equal(out[3], 0);
  assert.equal(out[out.length - 1], 255);
});

test("슬라이더 방향 — 밝기 · 대비 · 색온도 · 색조", () => {
  const mid = buildLuts(NO_AUTO, NO_MANUAL);
  const brighter = buildLuts(NO_AUTO, { ...NO_MANUAL, brightness: 50 });
  const darker = buildLuts(NO_AUTO, { ...NO_MANUAL, brightness: -50 });
  assert.ok(brighter[1][128] > mid[1][128] && darker[1][128] < mid[1][128]);
  // 밝기를 올려도 검정 · 흰색 끝은 그대로 (날아가지 않는다)
  assert.equal(brighter[1][0], 0);
  assert.equal(brighter[1][255], 255);

  const punchy = buildLuts(NO_AUTO, { ...NO_MANUAL, contrast: 50 });
  assert.ok(punchy[1][200] > mid[1][200] && punchy[1][60] < mid[1][60]);
  const flat = buildLuts(NO_AUTO, { ...NO_MANUAL, contrast: -50 });
  assert.ok(flat[1][200] < mid[1][200] && flat[1][60] > mid[1][60]);

  const warm = buildLuts(NO_AUTO, { ...NO_MANUAL, temperature: 60 });
  assert.ok(warm[0][128] > 128 && warm[2][128] < 128);
  const cool = buildLuts(NO_AUTO, { ...NO_MANUAL, temperature: -60 });
  assert.ok(cool[0][128] < 128 && cool[2][128] > 128);

  const magenta = buildLuts(NO_AUTO, { ...NO_MANUAL, tint: 60 });
  assert.ok(magenta[1][128] < 128);
  const green = buildLuts(NO_AUTO, { ...NO_MANUAL, tint: -60 });
  assert.ok(green[1][128] > 128);
});

test("표는 늘 오르막이다 (밝은 것이 더 어두워지지 않는다)", () => {
  const stats = analyze(gradient(10, 120, 4096, [15, 5, -20]));
  const luts = buildLuts(autoAdjust(stats), { brightness: 30, contrast: 40, temperature: -30, tint: 20 });
  for (const lut of luts) for (let v = 1; v < 256; v += 1) assert.ok(lut[v] >= lut[v - 1]);
});

test("픽셀이 거의 없으면 자동 보정은 아무것도 안 한다", () => {
  assert.deepEqual(autoAdjust(analyze(photo([[4, [10, 10, 10]]]))), NO_AUTO);
});

test("촬영 화면 어두움 안내 — 문턱과 깜빡임 막기", () => {
  assert.ok(meanLuma(photo([[100, [30, 30, 30]]])) < 31);
  assert.equal(nextDarkState(false, 40), true);
  assert.equal(nextDarkState(false, 60), false);
  // 켜진 뒤에는 문턱(55)을 조금 넘어도 바로 끄지 않는다
  assert.equal(nextDarkState(true, 60), true);
  assert.equal(nextDarkState(true, 80), false);
});
