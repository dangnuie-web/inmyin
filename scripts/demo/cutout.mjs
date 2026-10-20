// 흰 배경 사진의 배경을 지운다 — 데모 이미지 전용의 단순한 방법.
//
// 앱의 배경제거(@imgly/background-removal, lib/background-removal.ts)는 브라우저 안에서만 돈다(AI 모델을 브라우저가 내려받아 씀).
// 그래서 스크립트에서는 같은 것을 못 쓰고, 데모 이미지가 "흰 바탕 + 물건 하나 + 옅은 그림자"로 찍혀 있다는 점을 이용한다:
//   1) 밝고 색이 거의 없는 픽셀을 배경 후보로 본다 (흰 바탕 · 회색 그림자)
//   2) 사진 가장자리에서 시작해, 후보 픽셀끼리 밝기가 매끄럽게 이어지는 곳만 칠해 나간다(flood fill).
//      바탕의 그러데이션 · 그림자는 매끄럽게 이어지고, 물건의 테두리는 밝기가 뚝 끊겨서 거기서 멈춘다
//   3) 남은 것 중 아주 작은 조각(잡티)은 배경으로 돌린다
// 물건 안쪽의 흰 부분은 가장자리와 이어지지 않으면 남는다. 흰 물건의 테두리가 바탕처럼 매끄러우면 먹힐 수 있다.
// 새 패키지 없이 sharp(이미 설치됨)만 쓴다.

import sharp from "sharp";

export const CUTOUT_DEFAULTS = {
  // 배경 후보: 이 밝기 이상 (0~255)
  minLuma: 225,
  // 배경 후보: RGB 중 가장 큰 값과 작은 값의 차이가 이 이하 (색이 거의 없음)
  maxChroma: 24,
  // 이웃한 배경 픽셀끼리 밝기 차이가 이 이하일 때만 이어서 칠한다
  step: 2,
  // 전체 넓이의 이 비율보다 작은 물건 조각은 잡티로 보고 지운다
  minIslandRatio: 0.002,
  // 경계를 흐리는 정도 (계단 없애기)
  feather: 0.7,
  // 판정 전에 사진을 이만큼 흐린다. 생성 이미지 바탕에 한 줄씩 번갈아 밝기가 다른 잔무늬가 있어서,
  // 그대로 두면 이어 칠하기가 줄마다 끊긴다
  smooth: 1.2,
};

export async function whiteBackgroundCutout(input, options = {}) {
  const o = { ...CUTOUT_DEFAULTS, ...options };
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let judged = data;
  if (o.smooth > 0) {
    const smoothed = await sharp(data, { raw: { width, height, channels: 4 } }).blur(o.smooth).raw().toBuffer({ resolveWithObject: true });
    if (smoothed.info.channels !== 4) throw new Error("흐린 사진의 채널 수가 맞지 않습니다");
    judged = smoothed.data;
  }
  const background = backgroundMask(judged, width, height, o);

  const alpha = Buffer.alloc(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = background[i] ? 0 : 255;
  let soft = alpha;
  if (o.feather > 0) {
    // 한 채널로 넣어도 sharp 가 3채널(RGB)로 돌려줄 수 있어서 첫 채널만 꺼낸다 — 안 그러면 세 줄마다 어긋난다
    const blurred = await sharp(alpha, { raw: { width, height, channels: 1 } })
      .blur(Math.max(0.3, o.feather))
      .extractChannel(0)
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (blurred.info.channels !== 1 || blurred.data.length !== alpha.length) throw new Error("알파 채널 크기가 맞지 않습니다");
    soft = blurred.data;
    // 흐림이 물건 안쪽을 깎지 않게: 원래 물건이던 곳은 255 그대로
    for (let i = 0; i < soft.length; i++) if (alpha[i] === 255) soft[i] = 255;
  }
  for (let i = 0; i < width * height; i++) data[i * 4 + 3] = soft[i];

  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// 배경이면 1
export function backgroundMask(rgba, width, height, options = {}) {
  const o = { ...CUTOUT_DEFAULTS, ...options };
  const n = width * height;
  const luma = new Float32Array(n);
  const candidate = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    candidate[i] = luma[i] >= o.minLuma && Math.max(r, g, b) - Math.min(r, g, b) <= o.maxChroma ? 1 : 0;
  }

  const mask = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;
  const mark = (i) => {
    mask[i] = 1;
    stack[top++] = i;
  };
  const seed = (i) => {
    if (!mask[i] && candidate[i]) mark(i);
  };
  const spread = (from, i) => {
    if (!mask[i] && candidate[i] && Math.abs(luma[i] - luma[from]) <= o.step) mark(i);
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (top > 0) {
    const i = stack[--top];
    const x = i % width;
    if (x > 0) spread(i, i - 1);
    if (x < width - 1) spread(i, i + 1);
    if (i >= width) spread(i, i - width);
    if (i < n - width) spread(i, i + width);
  }

  // 작은 물건 조각(바탕의 잡티 · 그림자 자국)은 배경으로
  const minIsland = Math.max(1, Math.round(n * o.minIslandRatio));
  const seen = new Uint8Array(n);
  const component = new Int32Array(n);
  for (let start = 0; start < n; start++) {
    if (mask[start] || seen[start]) continue;
    let size = 0;
    top = 0;
    stack[top++] = start;
    seen[start] = 1;
    while (top > 0) {
      const i = stack[--top];
      component[size++] = i;
      const x = i % width;
      const next = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i >= width ? i - width : -1, i < n - width ? i + width : -1];
      for (const j of next) {
        if (j >= 0 && !mask[j] && !seen[j]) {
          seen[j] = 1;
          stack[top++] = j;
        }
      }
    }
    if (size < minIsland) for (let k = 0; k < size; k++) mask[component[k]] = 1;
  }
  return mask;
}
