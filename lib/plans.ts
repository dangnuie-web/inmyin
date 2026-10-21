// 플랜별 한도. DB에는 users.plan 만 저장하고, 한도는 항상 여기서 읽는다.
// maxBookmarks — 북마크를 모아 둘 수 있는 개수 (북마크 탭). 저장 비용보다는 북마크 탭이 한 번에 다 읽는 방식이라 둔 한도. 숫자만 바꾸면 된다.
// 하트에는 한도가 없다 — 모아 두는 것이 아니라 반응이라서
export const PLANS = {
  basic: { maxInventories: 5, slotCount: 25, maxBookmarks: 500 },
  premium: { maxInventories: 20, slotCount: 50, maxBookmarks: 2000 },
} as const;

export type Plan = keyof typeof PLANS;

// DB의 users.plan 은 그냥 글자라서, 모르는 값이 오면 basic 으로 본다
export function planLimits(plan: string) {
  return plan in PLANS ? PLANS[plan as Plan] : PLANS.basic;
}

// 프리미엄 한 달 이용권 (2026-10-21 당니님: 월 2,900원). 자동 결제가 아니라 한 번 결제하면 months 달.
// 4단계는 토스페이먼츠 테스트 모드라 실제 돈은 안 나간다. 결제 흐름은 lib/payments/
export const PREMIUM_PASS = {
  plan: "premium",
  price: 2900,
  months: 1,
  // 결제창 · 카드 내역에 찍히는 이름 (토스 규칙 100자까지)
  orderName: "INMYIN 프리미엄 한 달",
} as const;
