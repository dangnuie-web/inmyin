// 배경(과 나중에 글자)에 칠하는 색. 화면 디자인 토큰이 아니라 사용자가 고르는 물감이라 여기 따로 둔다.
// 흰색 · 파스텔 위주 — 배경을 지운 물건 사진이 어느 색 위에서든 잘 보이게
export const PALETTE = [
  "#ffffff", "#fff6e5", "#ffe4ec", "#ffd6cc", "#fff3b0", "#e3f6d8", "#d4f1f4", "#dbe7ff", "#e8dcff", "#f5e1f7",
  "#f2f2f2", "#c9c9c9", "#7a7a7a", "#000000", "#ff2d55", "#6155f5", "#2c8f5b", "#1d6fb8",
] as const;

// 그라디언트 두 색의 기본 짝. 처음 열었을 때 곧바로 예쁜 것이 보이게
export const GRADIENT_DEFAULT = { from: "#ffd6cc", to: "#e8dcff" } as const;
