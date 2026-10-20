// 사진 색 보정 (M-07 사진 편집 · M-06 촬영 화면의 어두움 안내).
// 브라우저의 캔버스 픽셀(RGBA 한 줄 배열)을 직접 계산한다 — 새 라이브러리 없이.
// 이 파일은 DOM 을 쓰지 않는다. 그래서 node 에서 시험할 수 있다 (adjust.test.mjs).
//
// 보정은 전부 "채널마다 0~255 → 0~255 표" 하나로 끝난다 (LUT, look-up table — 입력 값을 넣으면 출력 값이 나오는 표).
// 픽셀 하나하나를 따로 계산하지 않고 표를 한 번 만들어 찾아 쓰니 빠르고,
// 투명도(알파)는 건드리지 않아서 배경을 지운 사진에도 그대로 입힐 수 있다.

// RGBA 순서로 한 줄로 늘어선 픽셀. 캔버스 getImageData().data 와 같은 꼴
export type Pixels = Uint8ClampedArray | Uint8Array;

// 직접 미는 슬라이더 네 개. 모두 -100 ~ 100, 0 이 그대로
export type ManualAdjust = {
  brightness: number;
  contrast: number;
  // + 는 따뜻하게(노랗게), - 는 차갑게(파랗게)
  temperature: number;
  // + 는 자주색 쪽, - 는 녹색 쪽
  tint: number;
};

export const NO_MANUAL: ManualAdjust = { brightness: 0, contrast: 0, temperature: 0, tint: 0 };

// 자동 보정이 사진을 보고 정한 값
export type AutoAdjust = {
  // 화이트밸런스 — 채널마다 곱할 값
  gains: [number, number, number];
  // 레벨 — 이 밝기(0~255) 아래는 검정, 위는 흰색으로 펴 준다
  black: number;
  white: number;
  // 감마 — 1 보다 작으면 중간 톤이 밝아진다
  gamma: number;
  // 대비 — 1 보다 크면 진해진다
  contrast: number;
};

export const NO_AUTO: AutoAdjust = { gains: [1, 1, 1], black: 0, white: 255, gamma: 1, contrast: 1 };

// 사람 눈이 느끼는 밝기 (Rec.601 가중치)
function luma(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// 거의 투명한 픽셀은 세지 않는다 — 배경을 지운 사진에서 지운 자리까지 세면 사진이 아니라 빈칸을 보정하게 된다
const MIN_ALPHA = 128;

// 큰 사진은 픽셀을 건너뛰며 센다. 640×640 이면 약 10만 개만 본다
function strideFor(pixelCount: number, target = 100_000) {
  return Math.max(1, Math.floor(pixelCount / target));
}

export type PhotoStats = {
  // 센 픽셀 수
  count: number;
  // 밝기 평균 (0~255)
  meanLuma: number;
  // 밝기 히스토그램 (256칸)
  histogram: Uint32Array;
  // 화이트밸런스용 — 너무 어둡거나 밝거나 색이 진한 픽셀을 뺀 중간 톤의 채널 평균
  neutralMean: [number, number, number];
  neutralCount: number;
};

export function analyze(data: Pixels): PhotoStats {
  const pixelCount = Math.floor(data.length / 4);
  const stride = strideFor(pixelCount);
  const histogram = new Uint32Array(256);
  let count = 0;
  let lumaSum = 0;
  const neutralSum = [0, 0, 0];
  let neutralCount = 0;

  for (let p = 0; p < pixelCount; p += stride) {
    const i = p * 4;
    if (data[i + 3] < MIN_ALPHA) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = luma(r, g, b);
    histogram[Math.round(y)] += 1;
    lumaSum += y;
    count += 1;

    // 중간 톤 · 색이 옅은 픽셀만 "원래 회색이었을 것"으로 본다 (그레이 월드 가정을 좁힌 것).
    // 빨간 물건 하나가 사진을 채워도 그 빨강을 틀어진 색으로 오해하지 않게
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (y > 25 && y < 240 && max - min < 0.35 * max + 20) {
      neutralSum[0] += r;
      neutralSum[1] += g;
      neutralSum[2] += b;
      neutralCount += 1;
    }
  }

  const neutralMean: [number, number, number] = neutralCount
    ? [neutralSum[0] / neutralCount, neutralSum[1] / neutralCount, neutralSum[2] / neutralCount]
    : [128, 128, 128];
  return { count, meanLuma: count ? lumaSum / count : 0, histogram, neutralMean, neutralCount };
}

// 히스토그램에서 아래에서부터 fraction 만큼 센 자리의 밝기
export function percentile(histogram: Uint32Array, fraction: number) {
  let total = 0;
  for (const n of histogram) total += n;
  if (!total) return 0;
  const goal = total * fraction;
  let seen = 0;
  for (let v = 0; v < 256; v += 1) {
    seen += histogram[v];
    if (seen >= goal) return v;
  }
  return 255;
}

// 자동 보정 값 정하기.
// ① 화이트밸런스: 중간 톤 회색들의 평균이 회색이 되도록 채널을 곱한다 (70% 만 — 실내 조명 분위기는 조금 남긴다)
// ② 레벨: 밝기 하위 0.5% 를 검정, 상위 0.5% 를 흰색으로 편다 (너무 세게는 안 편다)
// ③ 감마: 편 뒤의 중앙값이 0.45 근처에 오게 중간 톤을 올리거나 내린다
// ④ 대비: 밝기가 좁게 몰려 있던 사진은 조금 더 진하게
export function autoAdjust(stats: PhotoStats): AutoAdjust {
  if (stats.count < 16) return NO_AUTO;

  // ①
  let gains: [number, number, number] = [1, 1, 1];
  if (stats.neutralCount >= 16) {
    const [r, g, b] = stats.neutralMean;
    const gray = (r + g + b) / 3;
    const STRENGTH = 0.7;
    gains = [r, g, b].map((c) => clamp(1 + STRENGTH * (gray / Math.max(c, 1) - 1), 0.75, 1.4)) as [number, number, number];
  }

  // ②
  const low = percentile(stats.histogram, 0.005);
  const high = percentile(stats.histogram, 0.995);
  // 검정은 60 까지만 끌어내리고, 흰색은 170 아래로는 안 올린다 — 원래 어두운 물건 · 밝은 물건을 회색으로 만들지 않게
  const black = clamp(low, 0, 60);
  let white = clamp(high, 170, 255);
  if (white - black < 64) white = Math.min(255, black + 64);

  // ③
  const median = percentile(stats.histogram, 0.5);
  const normalized = clamp((median - black) / (white - black), 0.02, 0.98);
  // 어둡게 하는 쪽은 1.2 까지만 — 흰 바탕에 놓고 찍은 사진이 회색으로 가라앉지 않게
  const gamma = clamp(Math.log(0.45) / Math.log(normalized), 0.55, 1.2);

  // ④ 원래 밝기 폭(분위 5~95%)이 좁을수록 조금 더 진하게. 최대 1.15
  const spread = percentile(stats.histogram, 0.95) - percentile(stats.histogram, 0.05);
  const contrast = clamp(1 + (140 - spread) / 600, 1, 1.15);

  return { gains, black, white, gamma, contrast };
}

// 0~1 사이 값에 대비를 준다. 가운데(0.5)를 축으로 늘이거나 줄인다
function applyContrast(x: number, k: number) {
  return (x - 0.5) * k + 0.5;
}

// 자동 값 + 슬라이더 값 → 채널별 표 세 개 [R, G, B]
export function buildLuts(auto: AutoAdjust, manual: ManualAdjust): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const t = clamp(manual.temperature, -100, 100) / 100;
  const tint = clamp(manual.tint, -100, 100) / 100;
  const b = clamp(manual.brightness, -100, 100) / 100;
  const c = clamp(manual.contrast, -100, 100) / 100;

  // 색온도: 따뜻하면 빨강을 올리고 파랑을 내린다. 색조: 자주색 쪽이면 녹색을 내린다
  const manualGains = [1 + 0.18 * t, 1 - 0.15 * tint, 1 - 0.18 * t];
  // 밝기는 감마로 — 그냥 더하면 밝은 곳이 하얗게 날아간다. 2^(-b·0.8): +100 이면 0.57, -100 이면 1.74
  const brightnessGamma = Math.pow(2, -b * 0.8);
  // 대비: -100 이면 0.5배, +100 이면 1.6배
  const manualContrast = c >= 0 ? 1 + 0.6 * c : 1 + 0.5 * c;

  const luts = [new Uint8ClampedArray(256), new Uint8ClampedArray(256), new Uint8ClampedArray(256)] as [
    Uint8ClampedArray,
    Uint8ClampedArray,
    Uint8ClampedArray,
  ];
  for (let ch = 0; ch < 3; ch += 1) {
    for (let v = 0; v < 256; v += 1) {
      let x = v * auto.gains[ch];
      x = (x - auto.black) / (auto.white - auto.black);
      x = clamp(x, 0, 1);
      x = Math.pow(x, auto.gamma);
      x = clamp(applyContrast(x, auto.contrast), 0, 1);
      x = clamp(x * manualGains[ch], 0, 1);
      x = Math.pow(x, brightnessGamma);
      x = clamp(applyContrast(x, manualContrast), 0, 1);
      luts[ch][v] = Math.round(x * 255);
    }
  }
  return luts;
}

// 표를 픽셀에 입힌다. 알파는 그대로. 새 배열로 돌려준다
export function applyLuts(data: Pixels, luts: [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray]) {
  const out = new Uint8ClampedArray(data.length);
  const [lr, lg, lb] = luts;
  for (let i = 0; i < data.length; i += 4) {
    out[i] = lr[data[i]];
    out[i + 1] = lg[data[i + 1]];
    out[i + 2] = lb[data[i + 2]];
    out[i + 3] = data[i + 3];
  }
  return out;
}

export function isIdentity(auto: AutoAdjust | null, manual: ManualAdjust) {
  return !auto && manual.brightness === 0 && manual.contrast === 0 && manual.temperature === 0 && manual.tint === 0;
}

// 촬영 화면(M-06) — 프레임이 어두운지. 작은 캔버스에 줄여 그린 영상의 밝기 평균으로 본다.
// 한 번 켜진 안내가 문턱 근처에서 깜빡이지 않게, 끌 때는 문턱보다 조금 더 밝아야 한다 (히스테리시스)
export const DARK_ON = 55;
export const DARK_OFF = 70;

export function meanLuma(data: Pixels) {
  return analyze(data).meanLuma;
}

export function nextDarkState(wasDark: boolean, mean: number) {
  return wasDark ? mean < DARK_OFF : mean < DARK_ON;
}
