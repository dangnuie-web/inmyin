// 배경 지우는 동안의 연출 (M-07) — 무늬 누끼로딩설계 v01 · B안 "테두리 잇기" (2026-10-20 당니님 결정)
// 기다리는 동안 사진 테두리 안쪽을 따라 흰 선이 진행률만큼 이어지고, 밝은 머리 한 토막은 늘 돈다.
// 끝나면 남은 테두리가 닫히고, 테두리 모양 그대로 바깥에서 안으로 배경이 걷힌다.
//
// ▼ 당니님 조정용 숫자는 여기 한 곳. 시간은 모두 ms(1000 = 1초)
export const CUTOUT_LOADING = {
  // 안내 알약
  pillDelay: 1500, // 이보다 빨리 끝나면 알약을 아예 안 띄움(두 번째부터는 대개 안 뜸)
  firstHintAt: 4000, // 이만큼 지나도 안 끝나면 "처음 한 번만 조금 오래 걸려요"(처음일 때만)
  showPercent: true, // 진행률을 알 때 알약에 % 를 붙일지

  // 진행률
  smoothing: 0.08, // 진행률이 툭 오를 때 따라가는 빠르기(1/60초당 남은 거리의 이만큼)
  creepPerSec: 0.012, // 한참 안 오를 때 1초에 저절로 미는 양(다음 단계 직전까지만)
  fakeTau: 7000, // 진행률을 모를 때 가짜 곡선의 느리기(클수록 느림)
  fakeCap: 0.9, // 가짜 곡선이 넘지 않는 끝(0.9 = 90%)
  tick: 200, // 선 길이를 다시 정하는 간격 — 사이는 CSS 가 부드럽게 잇는다(매 프레임 JS 없음)

  // 테두리 선
  inset: 6, // 사진 테두리 안쪽으로 들어온 거리(px)
  stroke: 1.5, // 진행 선 두께(px)
  head: 0.06, // 늘 도는 밝은 머리 길이(둘레 대비)
  headStroke: 2.5, // 밝은 머리 두께(px)
  headOpacity: 0.9,
  lap: 2600, // 머리 한 바퀴

  // 끝
  close: 280, // 다 지우면 남은 테두리를 잇는 시간
  reveal: 620, // 바깥에서 안으로 배경이 걷히는 시간(테두리가 닫힌 뒤)
  saveRevealScale: 0.7, // 저장을 눌러 기다렸으면 걷힘을 이만큼 빠르게
  saveHold: 320, // 저장 대기 중 다 지우면, 누끼를 보여주고 넘어가기까지 머무는 시간
  retouchFade: 160, // 걷힌 뒤 "손질" 알약이 나타나는 시간

  // 별 버튼
  starTwinkle: 1400, // 지우는 동안 작은 별이 반짝이는 한 주기(큰 별 · 원은 그대로)

  // 움직임 줄이기
  reducedFade: 200, // 걷힘 대신 엇갈림(cross-fade) 시간
} as const;
// ▲ 여기까지

// 처음 한 번 모델을 받은 적이 있는지 — 있으면 4초가 넘어도 "처음 한 번만…" 대신 "배경을 지우는 중"
export const MODEL_READY_KEY = "inmyin-bg-model-ready";

// ---- 진행률 정리 (lib/background-removal.ts 가 라이브러리의 progress 를 이걸로 정리한다) ----

// 화면에 줄 진행률. value 0~1, next 는 지금 단계가 끝나는 값(멈춘 동안 저절로 밀어도 여기 직전까지만)
export type CutoutProgress = { value: number; next: number };

export type ProgressTracker = {
  fetched: Record<string, { current: number; total: number }>;
  computeStep: number; // -1 아직 계산 전, 0~4 계산 단계
  shown: CutoutProgress;
};

// 내려받기가 전체의 80%, 계산 네 단계가 나머지 20% (설계서 6절 1)
const DOWNLOAD_SHARE = 0.8;

export function newProgressTracker(): ProgressTracker {
  return { fetched: {}, computeStep: -1, shown: { value: 0, next: DOWNLOAD_SHARE } };
}

// 라이브러리의 progress(key, current, total) 하나를 받아 화면 진행률을 돌려준다.
// fetch:* 는 key 마다 받은 양을 모아 합한다 — 새 key 가 늦게 나타나면 전체가 커져 숫자가 뒤로 갈 수 있어서 값은 줄지 않게 한다
export function trackProgress(tracker: ProgressTracker, key: string, current: number, total: number): CutoutProgress {
  let value: number;
  let next: number;
  if (key.startsWith("fetch:")) {
    tracker.fetched[key] = { current, total };
    if (tracker.computeStep >= 0) return tracker.shown;
    let got = 0;
    let all = 0;
    for (const entry of Object.values(tracker.fetched)) {
      got += Math.min(entry.current, entry.total);
      all += entry.total;
    }
    value = all > 0 ? (got / all) * DOWNLOAD_SHARE : 0;
    next = DOWNLOAD_SHARE;
  } else if (key.startsWith("compute:")) {
    const step = total > 0 ? Math.max(0, Math.min(total, current)) / total : 0;
    tracker.computeStep = Math.max(tracker.computeStep, step * 4);
    const done = tracker.computeStep / 4;
    value = DOWNLOAD_SHARE + (1 - DOWNLOAD_SHARE) * done;
    next = DOWNLOAD_SHARE + (1 - DOWNLOAD_SHARE) * Math.min(1, done + 0.25);
  } else {
    return tracker.shown;
  }
  const shownValue = Math.max(tracker.shown.value, Math.min(1, value));
  tracker.shown = { value: shownValue, next: Math.max(next, shownValue) };
  return tracker.shown;
}

// 진행률을 모를 때의 가짜 곡선 — 처음엔 빠르고 점점 느려지며 fakeCap 을 넘지 않는다
export function fakeProgress(elapsedMs: number, tau: number = CUTOUT_LOADING.fakeTau, cap: number = CUTOUT_LOADING.fakeCap) {
  return cap * (1 - Math.exp(-Math.max(0, elapsedMs) / tau));
}

// 화면에 그릴 선 길이를 한 걸음 옮긴다. 줄어들지 않는다.
// - 진행률을 알면: 목표까지 smoothing 으로 따라가고, 목표에 닿아 멈춰 있으면 creepPerSec 로 다음 단계 직전까지만 민다
// - 모르면(target 이 null): 가짜 곡선
export function stepShown(
  shown: number,
  target: CutoutProgress | null,
  dtMs: number,
  elapsedMs: number,
  values: { smoothing: number; creepPerSec: number; fakeTau: number; fakeCap: number } = CUTOUT_LOADING,
) {
  if (!target) return Math.max(shown, fakeProgress(elapsedMs, values.fakeTau, values.fakeCap));
  const goal = Math.min(1, target.value);
  if (shown < goal) {
    // 1/60초에 남은 거리의 smoothing 만큼 — 간격이 달라도 같은 빠르기가 되게 거듭제곱으로
    const k = 1 - Math.pow(1 - values.smoothing, dtMs / (1000 / 60));
    return shown + (goal - shown) * k;
  }
  const ceiling = Math.min(1, target.next) - 0.01;
  if (shown >= ceiling) return shown;
  return Math.min(ceiling, shown + (values.creepPerSec * dtMs) / 1000);
}

// 저장을 눌러 기다렸다가 다 지웠을 때, 넘어가기 전에 기다릴 시간 — 테두리 닫힘 + 빠른 걷힘 + 누끼 보여주기
export function saveWaitMs(reducedMotion: boolean, values: typeof CUTOUT_LOADING = CUTOUT_LOADING) {
  if (reducedMotion) return values.reducedFade + values.saveHold;
  return values.close + values.reveal * values.saveRevealScale + values.saveHold;
}

// 안내 알약 문구. null 이면 알약을 안 띄운다
export function pillText({
  elapsedMs,
  saveQueued,
  firstTime,
  percent,
  values = CUTOUT_LOADING,
}: {
  elapsedMs: number;
  saveQueued: boolean;
  firstTime: boolean;
  percent: number | null;
  values?: typeof CUTOUT_LOADING;
}): { text: string; percent: string | null } | null {
  let text: string;
  if (saveQueued) text = "다 지우면 바로 넘어가요";
  else if (elapsedMs < values.pillDelay) return null;
  else if (firstTime && elapsedMs >= values.firstHintAt) text = "처음 한 번만 조금 오래 걸려요";
  else text = "배경을 지우는 중";
  const shown = values.showPercent && percent !== null ? `${Math.min(99, Math.floor(percent * 100))}%` : null;
  return { text, percent: shown };
}

// 테두리 선 모양 — 사진 칸(한 변 size px) 안쪽 inset 만큼 들어온 둥근 네모. 시안처럼 왼쪽 위 모서리 끝에서 시작해 시계 방향
export function borderPath(size: number, inset: number = CUTOUT_LOADING.inset, frameRadius = 12) {
  const r = Math.max(0, frameRadius - inset / 2);
  const a = inset;
  const b = size - inset;
  return [
    `M${a + r} ${a}`,
    `H${b - r}`,
    `A${r} ${r} 0 0 1 ${b} ${a + r}`,
    `V${b - r}`,
    `A${r} ${r} 0 0 1 ${b - r} ${b}`,
    `H${a + r}`,
    `A${r} ${r} 0 0 1 ${a} ${b - r}`,
    `V${a + r}`,
    `A${r} ${r} 0 0 1 ${a + r} ${a}`,
    "Z",
  ].join(" ");
}
