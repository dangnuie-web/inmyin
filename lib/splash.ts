// 스플래시(S-00) — 홈 화면 앱을 열 때 잠깐 뜨는 화면의 모양 값. 두 곳이 이 값을 같이 쓴다:
//   components/Splash.tsx                 앱 안 첫 화면 (HTML 위에 덮는 판, 잠깐 뒤 사라짐)
//   app/apple-splash/[size]/route.tsx     아이폰 시작 그림 (apple-touch-startup-image) — 아이폰은 매니페스트로 스플래시를 만들지 않고,
//                                         기종마다 화면 크기에 꼭 맞는 그림이 있어야 앱이 뜨는 동안 보여준다
// 두 그림이 같아야 시작 그림 → 앱 안 첫 화면으로 넘어갈 때 튀지 않는다. 값은 CSS px(아이폰의 pt) 기준
//
// 피그마 S-00 스플래시(웹)의 로고 · In my inventory · 흩어진 점과 별. 0단계 결정대로 흑백 — 보라 점은 검정, 별은 회색.
// 시안의 물건 · 말풍선 · 버튼은 랜딩(/welcome) 몫이라 여기엔 없다

// 로고(public/logo.svg)와 그 아래 "In my inventory". 랜딩 첫머리와 같은 크기 (h-16 · gap-3 · text-title).
// 로고는 높이로 맞춘다 — y 꼬리가 아래로 내려가서 너비로 맞추면 글자가 들쭉날쭉해진다. aspect 는 너비 ÷ 높이 (logo.svg 의 viewBox)
export const SPLASH_LOGO = { src: "/logo.svg", height: 64, aspect: 53.64 / 17.85 };
export const SPLASH_GAP = 12;
export const SPLASH_SUBTITLE = { text: "In my inventory", size: 20, lineHeight: 1.3 };

// 점 · 별의 크기와 색 토큰
export const SPLASH_DOT = { size: 8, color: "ink" };
export const SPLASH_STAR = { size: 18, color: "gray-3" };

// 점 · 별의 자리 — 화면 너비 · 높이에 대한 % (가운데 좌표). 시안(1280×832)의 자리를 그대로 비율로 옮겼다.
// 위 · 아래 띠에만 있어서 세로 화면에서도 가운데 로고를 가리지 않는다
export const SPLASH_MARKS: { kind: "dot" | "star"; x: number; y: number }[] = [
  { kind: "dot", x: 32.3, y: 6.6 },
  { kind: "dot", x: 13.5, y: 28.5 },
  { kind: "dot", x: 90.6, y: 25.8 },
  { kind: "dot", x: 6.7, y: 67.5 },
  { kind: "dot", x: 86.1, y: 72.2 },
  { kind: "star", x: 9.6, y: 11.4 },
  { kind: "star", x: 22.8, y: 26.8 },
  { kind: "star", x: 84.2, y: 9.4 },
  { kind: "star", x: 94, y: 37.7 },
  { kind: "star", x: 12.2, y: 77 },
  { kind: "star", x: 74.3, y: 72.4 },
];

// 별 모양 (24 × 24 칸 안의 다섯 꼭지 별)
export const STAR_VIEWBOX = "0 0 24 24";
export const STAR_PATH = "M12 1.5l3.09 7.02 7.66.7-5.8 5.06 1.72 7.5L12 17.86 5.33 21.78l1.72-7.5-5.8-5.06 7.66-.7z";

// 앱 안 첫 화면이 머무는 시간과 사라지는 시간 (ms). "움직임 줄이기"면 사라질 때 흐려지지 않고 바로 없어진다
export const SPLASH_HOLD_MS = 600;
export const SPLASH_FADE_MS = 400;

// 아이폰 기종별 화면 — 세로만 (매니페스트가 세로 고정). 너비 × 높이(pt) × 배율. 그림은 너비·높이에 배율을 곱한 px 로 만든다.
// 목록에 없는 기종(아이패드, 새로 나올 아이폰)은 시작 그림 없이 흰 화면 → 앱 안 첫 화면으로 이어진다. 새 기종이 나오면 여기에 한 줄 더한다
export const IPHONE_SCREENS: { width: number; height: number; ratio: number; models: string }[] = [
  { width: 320, height: 568, ratio: 2, models: "SE 1세대" },
  { width: 375, height: 667, ratio: 2, models: "6 · 7 · 8 · SE 2 · 3세대" },
  { width: 414, height: 736, ratio: 3, models: "6 · 7 · 8 Plus" },
  { width: 375, height: 812, ratio: 3, models: "X · XS · 11 Pro · 12 mini · 13 mini" },
  { width: 414, height: 896, ratio: 2, models: "XR · 11" },
  { width: 414, height: 896, ratio: 3, models: "XS Max · 11 Pro Max" },
  { width: 390, height: 844, ratio: 3, models: "12 · 12 Pro · 13 · 13 Pro · 14 · 16e" },
  { width: 428, height: 926, ratio: 3, models: "12 Pro Max · 13 Pro Max · 14 Plus" },
  { width: 393, height: 852, ratio: 3, models: "14 Pro · 15 · 15 Pro · 16" },
  { width: 430, height: 932, ratio: 3, models: "14 Pro Max · 15 Plus · 15 Pro Max · 16 Plus" },
  { width: 402, height: 874, ratio: 3, models: "16 Pro · 17 · 17 Pro" },
  { width: 420, height: 912, ratio: 3, models: "Air" },
  { width: 440, height: 956, ratio: 3, models: "16 Pro Max · 17 Pro Max" },
];

// 시작 그림 파일 이름: 실제 px 크기 (예: 1179x2556.png)
export function splashFileName({ width, height, ratio }: { width: number; height: number; ratio: number }) {
  return `${width * ratio}x${height * ratio}.png`;
}
