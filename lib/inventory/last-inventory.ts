// 마지막에 연 내 인벤토리 — 하단 탭 가운데 + (/add)가 그 인벤토리의 촬영으로 바로 간다 (2026-10-20, 무늬 설계서 2-2).
// 서버의 redirect 가 읽어야 해서 localStorage 가 아니라 쿠키. 스키마는 바꾸지 않는다 — 기기마다 따로 기억한다
export const LAST_INVENTORY_COOKIE = "inmyin-last-inventory";
// 1년
export const LAST_INVENTORY_MAX_AGE = 60 * 60 * 24 * 365;
