"use server";

import { requireProfile } from "@/lib/auth/profile";
import { createPremiumOrder } from "@/lib/payments/orders";

type StartResult =
  | { ok: true; orderId: string; amount: number; orderName: string; customerKey: string }
  | { ok: false; message: string };

// 결제 버튼 → 주문부터 만든다. 금액은 서버 상수(PREMIUM_PASS)에서 — 화면이 보낸 값이 없다.
// customerKey 는 토스가 구매자를 가리는 값(10~50자). 유저 id(uuid 36자)를 쓴다 — 이메일 · 전화번호처럼 알아볼 수 있는 값은 쓰지 않는다
export async function startPremiumOrder(): Promise<StartResult> {
  const profile = await requireProfile();
  if (profile.plan === "premium") return { ok: false, message: "이미 프리미엄을 쓰고 있어요." };

  const order = await createPremiumOrder(profile.id);
  if (!order) return { ok: false, message: "결제를 아직 준비하지 못했어요. 잠시 뒤 다시 해 주세요." };
  return { ok: true, ...order, customerKey: profile.id };
}
