// 세로 로고(public/logo-stacked.svg) — 가방 위 + 글자 로고 아래. 2026-10-21 당니님 결정(무늬 시안 안 3).
// 쓰는 곳: 로그인 · 스플래시 · 오프라인. 랜딩 · 웹 상단 바 · 폰 헤더는 글자 로고(public/logo.svg) 그대로.
//
// 크기는 "글자 부분의 높이"로 정한다 — 글자 로고만 쓰던 때와 글자 크기가 같게(비교판 5절 로그인 목업: 글자 44px → 전체 106px).
// 당니님이 크기를 바꿀 땐 아래 STACKED_LOGO_LETTER 의 숫자만 고치면 된다.
export const STACKED_LOGO_LETTER = {
  login: 44, // 로그인 (A-01)
  offline: 44, // 오프라인 화면
  splash: 64, // 스플래시 (앱 안 첫 화면 · 아이폰 시작 그림 둘 다)
};

// 파일의 viewBox 가로 · 세로와, 그 안 글자 로고 부분의 세로(logo.svg 의 viewBox 높이)
const VIEW_W = 55.4;
const VIEW_H = 43.066;
const LETTER_VIEW_H = 17.85;

export const STACKED_LOGO_SRC = "/logo-stacked.svg";

// 글자 높이(px) → 그림 전체의 너비 · 높이(px)
export function stackedLogoSize(letterHeight: number) {
  const height = (letterHeight * VIEW_H) / LETTER_VIEW_H;
  return { width: (height * VIEW_W) / VIEW_H, height };
}
