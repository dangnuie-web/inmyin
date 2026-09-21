// 플랜별 한도. DB에는 users.plan 만 저장하고, 한도는 항상 여기서 읽는다.
export const PLANS = {
  basic: { maxInventories: 5, slotCount: 25 },
  premium: { maxInventories: 20, slotCount: 50 },
} as const;

export type Plan = keyof typeof PLANS;

// DB의 users.plan 은 그냥 글자라서, 모르는 값이 오면 basic 으로 본다
export function planLimits(plan: string) {
  return plan in PLANS ? PLANS[plan as Plan] : PLANS.basic;
}
