// 256색 팔레트 PNG (오피스 로드맵 3단계 "아이템 사진이 무거움" — 사파리 누끼). npm run test:image
import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { encodeIndexedPng, hasTransparency, quantize } from "./png8.ts";

// 시험용 — 만든 팔레트 PNG 를 다시 픽셀로 (거르기 0 만)
function readIndexedPng(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.deepEqual([...bytes.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let at = 8, width, height, palette, alpha = new Uint8Array(), idat = [];
  const types = [];
  while (at < bytes.length) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const body = bytes.subarray(at + 8, at + 8 + length);
    types.push(type);
    if (type === "IHDR") {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      assert.deepEqual([...body.subarray(8)], [8, 3, 0, 0, 0]);
    }
    if (type === "PLTE") palette = body;
    if (type === "tRNS") alpha = body;
    if (type === "IDAT") idat.push(body);
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    assert.equal(raw[y * (width + 1)], 0);
    for (let x = 0; x < width; x++) {
      const index = raw[y * (width + 1) + 1 + x];
      const out = (y * width + x) * 4;
      data.set(palette.subarray(index * 3, index * 3 + 3), out);
      data[out + 3] = index < alpha.length ? alpha[index] : 255;
    }
  }
  return { width, height, data, types };
}

// 누끼처럼 — 가운데 원은 부드러운 색 띠, 가장자리 반투명, 바깥은 완전 투명
function cutoutLike(size, alphaInside = 255) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const at = (y * size + x) * 4;
      const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
      data[at] = (x * 255) / size;
      data[at + 1] = (y * 255) / size;
      data[at + 2] = 128 + 60 * Math.sin(x / 7);
      data[at + 3] = d < 0.8 ? alphaInside : d < 0.9 ? Math.round(alphaInside * (0.9 - d) * 10) : 0;
    }
  return data;
}

function psnr(a, b) {
  let se = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4)
    for (const background of [255, 0])
      for (let c = 0; c < 3; c++) {
        const x = (a[i + c] * a[i + 3] + background * (255 - a[i + 3])) / 255;
        const y = (b[i + c] * b[i + 3] + background * (255 - b[i + 3])) / 255;
        se += (x - y) ** 2;
        n++;
      }
  return 10 * Math.log10((255 * 255) / (se / n));
}

test("투명 찾기 — 한 픽셀이라도 255 미만이면 true", () => {
  const opaque = new Uint8Array(4 * 4).fill(255);
  assert.equal(hasTransparency(opaque), false);
  opaque[7] = 254;
  assert.equal(hasTransparency(opaque), true);
});

test("완전 투명은 그대로 완전 투명, 불투명은 그대로 불투명 — 피드 · 에디터에서 지운 자리가 칠해지지 않는다", async () => {
  const size = 96;
  const data = cutoutLike(size);
  const back = readIndexedPng(await encodeIndexedPng(quantize(data, size, size)));
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) assert.equal(back.data[i], 0);
    if (data[i] === 255) assert.equal(back.data[i], 255);
  }
  assert.ok(back.types.includes("tRNS"));
});

test("색은 256개 이하, 원래와 가깝다 (빨 · 초 두 방향 그라데이션 — 256색에 가장 어려운 그림이라 PSNR 30dB 이상)", async () => {
  const size = 128;
  const data = cutoutLike(size);
  const image = quantize(data, size, size);
  assert.ok(image.palette.length / 4 <= 256);
  { const value = psnr(data, readIndexedPng(await encodeIndexedPng(image)).data); assert.ok(value > 30, `PSNR ${value}`); }
});

test("한 칸에 픽셀이 몰린 누끼(알파 254 뿐)도 색표가 비지 않는다 — 2026-10-21 카드지갑 사진에서 4색만 남던 것", async () => {
  const size = 128;
  const data = cutoutLike(size, 254);
  // 한 색이 절반 넘게
  for (let i = 0; i < data.length / 2; i += 4) if (data[i + 3]) data.set([200, 190, 180], i);
  const image = quantize(data, size, size);
  const used = new Set(image.indices);
  assert.ok(used.size > 100, `쓰인 색 ${used.size}`);
  for (const value of image.palette) assert.ok(Number.isInteger(value));
  { const value = psnr(data, readIndexedPng(await encodeIndexedPng(image)).data); assert.ok(value > 32, `PSNR ${value}`); }
});

test("색이 적은 그림은 잃지 않고 그대로", async () => {
  const data = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 0, 0, 0, 0, 255, 128]);
  const back = readIndexedPng(await encodeIndexedPng(quantize(data, 2, 2)));
  assert.deepEqual([...back.data], [...data]);
});

test("캔버스 PNG(픽셀 4바이트)보다 훨씬 작다", async () => {
  const size = 256;
  const data = cutoutLike(size);
  const png = await encodeIndexedPng(quantize(data, size, size));
  assert.ok(png.length < size * size, `${png.length}B`);
});
