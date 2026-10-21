// 투명이 있는 사진(배경을 지운 누끼)을 256색 팔레트 PNG 로 만든다 — 사파리처럼 webp 로 못 만드는 브라우저용 (resize.ts).
// 사파리의 캔버스 PNG 는 한 픽셀에 4바이트를 그대로 담아서 640px 누끼 한 장이 80~620KB 다. jpeg 은 투명이 없고,
// webp 은 사파리가 못 만든다. 그래서 색을 256개로 줄인 팔레트 PNG(색 번호 1바이트 + 색표 · 투명표)를 직접 만든다.
// pngquant 와 같은 방식(중앙값 자르기 → k-평균으로 다듬기 → 오차 퍼뜨리기)을 새 패키지 없이 이 파일 하나로.
// 압축은 브라우저에 들어 있는 CompressionStream("deflate") — zlib 형식이라 PNG 의 IDAT 에 그대로 들어간다.
// 계산만 하는 파일이라 노드 시험에서 그대로 부른다 (png8.test.mjs)

type Pixels = Uint8ClampedArray | Uint8Array;

// 한 픽셀이라도 덜 불투명하면 true. 투명이 없으면 jpeg 으로 가도 잃는 것이 없다
export function hasTransparency(data: Pixels) {
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

// 알파 차이를 색 차이보다 무겁게 — 가장자리가 계단지지 않게
const ALPHA_WEIGHT = 2;
// 오차 퍼뜨리기 세기(1 = 플로이드-스타인버그 그대로). 조금 줄이면 얼룩이 덜 생기고 파일도 덜 커진다
const DITHER = 0.8;
// 이보다 불투명한 색표 색은 255 로
const OPAQUE_SNAP = 248;

type Entry = { r: number; g: number; b: number; a: number; count: number };

function distance(r: number, g: number, b: number, a: number, palette: Float64Array, at: number) {
  const dr = r - palette[at];
  const dg = g - palette[at + 1];
  const db = b - palette[at + 2];
  const da = (a - palette[at + 3]) * ALPHA_WEIGHT;
  return dr * dr + dg * dg + db * db + da * da;
}

function nearest(r: number, g: number, b: number, a: number, palette: Float64Array, count: number, from = 0) {
  let best = from;
  let bestDistance = Infinity;
  for (let index = from; index < count; index++) {
    const d = distance(r, g, b, a, palette, index * 4);
    if (d < bestDistance) {
      bestDistance = d;
      best = index;
    }
  }
  return best;
}

// 비슷한 색끼리 묶은 칸(빨 · 초 · 파 5비트, 알파 3비트). 칸마다 개수와 평균색
function histogram(data: Pixels): Entry[] {
  const size = 1 << 18;
  const counts = new Uint32Array(size);
  const sums = new Float64Array(size * 4);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const key = ((data[i] >> 3) << 13) | ((data[i + 1] >> 3) << 8) | ((data[i + 2] >> 3) << 3) | (a >> 5);
    counts[key]++;
    sums[key * 4] += data[i];
    sums[key * 4 + 1] += data[i + 1];
    sums[key * 4 + 2] += data[i + 2];
    sums[key * 4 + 3] += a;
  }
  const entries: Entry[] = [];
  for (let key = 0; key < size; key++) {
    const count = counts[key];
    if (count) entries.push({ r: sums[key * 4] / count, g: sums[key * 4 + 1] / count, b: sums[key * 4 + 2] / count, a: sums[key * 4 + 3] / count, count });
  }
  return entries;
}

const CHANNELS = ["r", "g", "b", "a"] as const;

// 중앙값 자르기 — 색이 가장 넓게 퍼진 상자를 그 방향의 (개수 기준) 가운데에서 둘로 나누기를 원하는 개수가 될 때까지
function medianCut(entries: Entry[], wanted: number) {
  type Box = { items: Entry[]; score: number; channel: (typeof CHANNELS)[number] };
  const measure = (items: Entry[]): Box => {
    let best: (typeof CHANNELS)[number] = "r";
    let bestRange = -1;
    let total = 0;
    for (const item of items) total += item.count;
    for (const channel of CHANNELS) {
      let min = Infinity;
      let max = -Infinity;
      for (const item of items) {
        min = Math.min(min, item[channel]);
        max = Math.max(max, item[channel]);
      }
      const range = (max - min) * (channel === "a" ? ALPHA_WEIGHT : 1);
      if (range > bestRange) {
        bestRange = range;
        best = channel;
      }
    }
    // 넓게 퍼지고 픽셀이 많은 상자부터 — 많이 보이는 색이 더 촘촘해진다
    return { items, score: items.length > 1 ? bestRange * Math.sqrt(total) : -1, channel: best };
  };

  const boxes = [measure(entries)];
  while (boxes.length < wanted) {
    let at = 0;
    for (let i = 1; i < boxes.length; i++) if (boxes[i].score > boxes[at].score) at = i;
    const box = boxes[at];
    if (box.score <= 0) break;
    const { channel } = box;
    const items = box.items.slice().sort((x, y) => x[channel] - y[channel]);
    let half = 0;
    for (const item of items) half += item.count;
    half /= 2;
    // 양쪽에 하나 이상은 남긴다 — 한 칸에 픽셀이 몰린 사진(알파 254 뿐인 누끼 등)에서 빈 상자가 생기면 색표가 비어 버린다
    let split = 0;
    for (let seen = 0; split < items.length - 2; split++) {
      seen += items[split].count;
      if (seen >= half) break;
    }
    boxes.splice(at, 1, measure(items.slice(0, split + 1)), measure(items.slice(split + 1)));
  }
  return boxes.map((box) => box.items);
}

function average(items: Entry[], palette: Float64Array, at: number) {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let total = 0;
  for (const item of items) {
    r += item.r * item.count;
    g += item.g * item.count;
    b += item.b * item.count;
    a += item.a * item.count;
    total += item.count;
  }
  palette[at] = r / total;
  palette[at + 1] = g / total;
  palette[at + 2] = b / total;
  palette[at + 3] = a / total;
}

export type IndexedImage = {
  width: number;
  height: number;
  // 색 하나에 4칸(r, g, b, a). 덜 불투명한 색이 앞에 온다 — 투명표(tRNS)가 짧아진다
  palette: Uint8Array;
  // 픽셀마다 색 번호
  indices: Uint8Array;
};

// 색을 maxColors 개 이하로 줄인다. 완전히 투명한 픽셀은 모두 한 색(투명)으로
export function quantize(data: Pixels, width: number, height: number, maxColors = 256): IndexedImage {
  const pixelCount = width * height;
  let anyClear = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) {
      anyClear = true;
      break;
    }
  }
  const entries = histogram(data);
  const wanted = Math.max(1, maxColors - (anyClear ? 1 : 0));

  // 색표 만들기 — 칸이 원하는 개수보다 적으면 칸의 평균색이 곧 색표
  let groups: Entry[][];
  if (entries.length <= wanted) groups = entries.map((entry) => [entry]);
  else groups = medianCut(entries, wanted);
  let count = groups.length;
  const working = new Float64Array(Math.max(1, count) * 4);
  groups.forEach((items, index) => average(items, working, index * 4));

  // k-평균으로 몇 번 다듬는다 — 칸마다 가장 가까운 색에 붙이고 색을 그 평균으로
  if (entries.length > wanted) {
    for (let round = 0; round < 3; round++) {
      const sums = new Float64Array(count * 5);
      for (const entry of entries) {
        const index = nearest(entry.r, entry.g, entry.b, entry.a, working, count);
        sums[index * 5] += entry.r * entry.count;
        sums[index * 5 + 1] += entry.g * entry.count;
        sums[index * 5 + 2] += entry.b * entry.count;
        sums[index * 5 + 3] += entry.a * entry.count;
        sums[index * 5 + 4] += entry.count;
      }
      for (let index = 0; index < count; index++) {
        const total = sums[index * 5 + 4];
        if (!total) continue;
        for (let channel = 0; channel < 4; channel++) working[index * 4 + channel] = sums[index * 5 + channel] / total;
      }
    }
  }

  // 완전 투명은 따로 한 칸. 색표를 알파 순으로 — 투명표가 짧아진다
  const colors: number[][] = [];
  if (anyClear) colors.push([0, 0, 0, 0]);
  for (let index = 0; index < count; index++) {
    const at = index * 4;
    const color = [0, 1, 2, 3].map((channel) => Math.max(0, Math.min(255, Math.round(working[at + channel]))));
    // 거의 불투명한 색은 완전 불투명으로 — 불투명한 몸통이 어두운 바탕에서 살짝 비치지 않게
    if (color[3] >= OPAQUE_SNAP) color[3] = 255;
    colors.push(color);
  }
  colors.sort((x, y) => x[3] - y[3]);
  count = colors.length;
  const palette = new Float64Array(count * 4);
  colors.forEach((color, index) => palette.set(color, index * 4));
  // 알파 순이라 불투명 색은 뒤에 몰려 있다. 불투명 픽셀은 여기서부터만 고른다
  let firstOpaque = colors.findIndex((color) => color[3] === 255);
  if (firstOpaque < 0) firstOpaque = 0;

  // 픽셀마다 색 번호. 거의 불투명한 픽셀(색표처럼 248 이상)은 불투명 색 중에서 고르고, 가까운 색 찾기를
  // (6 · 6 · 6비트) 칸마다 한 번만 계산해 둔다. 그보다 투명한 가장자리는 알파가 칸마다 달라서 매번 정확히 찾는다
  const cache = new Int16Array(1 << 18).fill(-1);
  const lookup = (r: number, g: number, b: number, a: number) => {
    if (a >= OPAQUE_SNAP) {
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      let index = cache[key];
      if (index < 0) cache[key] = index = nearest(r, g, b, 255, palette, count, firstOpaque);
      return index;
    }
    // 완전 투명 칸(맨 앞, 알파 0)은 알파 0 픽셀만 간다
    return nearest(r, g, b, a, palette, count, anyClear && count > 1 ? 1 : 0);
  };

  // 플로이드-스타인버그 — 줄인 색의 오차를 오른쪽 · 아랫줄로 나눠 준다(색만, 알파는 그대로). 띠 무늬가 덜 보인다
  const indices = new Uint8Array(pixelCount);
  let current = new Float32Array((width + 2) * 3);
  let next = new Float32Array((width + 2) * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const at = pixel * 4;
      const a = data[at + 3];
      if (a === 0) {
        indices[pixel] = 0;
        continue;
      }
      const e = (x + 1) * 3;
      const r = clamp(data[at] + current[e]);
      const g = clamp(data[at + 1] + current[e + 1]);
      const b = clamp(data[at + 2] + current[e + 2]);
      const index = lookup(r, g, b, a);
      indices[pixel] = index;
      // 반투명 가장자리는 오차를 덜 퍼뜨린다 — 투명 쪽으로 번지지 않게
      const strength = (DITHER * a) / 255;
      const er = (r - palette[index * 4]) * strength;
      const eg = (g - palette[index * 4 + 1]) * strength;
      const eb = (b - palette[index * 4 + 2]) * strength;
      spread(current, e + 3, er, eg, eb, 7 / 16);
      spread(next, e - 3, er, eg, eb, 3 / 16);
      spread(next, e, er, eg, eb, 5 / 16);
      spread(next, e + 3, er, eg, eb, 1 / 16);
    }
    [current, next] = [next, current];
    next.fill(0);
  }

  return { width, height, palette: Uint8Array.from(colors.flat()), indices };
}

function clamp(value: number) {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

function spread(row: Float32Array, at: number, r: number, g: number, b: number, share: number) {
  row[at] += r * share;
  row[at + 1] += g * share;
  row[at + 2] += b * share;
}

// ── PNG 파일로

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array) {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}

export async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// 팔레트 PNG(색 형식 3, 8비트) 바이트. 줄마다 거르기 없음(0) — 팔레트 그림은 이쪽이 가장 작다
export async function encodeIndexedPng({ width, height, palette, indices }: IndexedImage): Promise<Uint8Array> {
  const count = palette.length / 4;
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header.set([8, 3, 0, 0, 0], 8);

  const rgb = new Uint8Array(count * 3);
  let translucent = 0;
  for (let index = 0; index < count; index++) {
    rgb.set(palette.subarray(index * 4, index * 4 + 3), index * 3);
    if (palette[index * 4 + 3] < 255) translucent = index + 1;
  }
  const alpha = new Uint8Array(translucent);
  for (let index = 0; index < translucent; index++) alpha[index] = palette[index * 4 + 3];

  const raw = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y++) raw.set(indices.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("PLTE", rgb),
    ...(translucent ? [chunk("tRNS", alpha)] : []),
    chunk("IDAT", await deflate(raw)),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
