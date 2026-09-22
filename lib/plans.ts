// 플랜별 한도. DB에는 users.plan 만 저장하고, 한도는 항상 여기서 읽는다.
// maxLikes — 좋아요를 모아 둘 수 있는 개수 (Like 탭). 저장 비용보다는 Like 탭이 한 번에 다 읽는 방식이라 둔 한도. 숫자만 바꾸면 된다
export const PLANS = {
  basic: { maxInventories: 5, slotCount: 25, maxLikes: 500 },
  premium: { maxInventories: 20, slotCount: 50, maxLikes: 2000 },
} as const;

export type Plan = keyof typeof PLANS;

// DB의 users.plan 은 그냥 글자라서, 모르는 값이 오면 basic 으로 본다
export function planLimits(plan: string) {
  return plan in PLANS ? PLANS[plan as Plan] : PLANS.basic;
}
