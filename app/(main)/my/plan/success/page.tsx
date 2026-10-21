import type { Metadata } from "next";
import { PlanSuccessView } from "@/components/plan/PlanScreens";
import { requireProfile } from "@/lib/auth/profile";
import { readPremiumUntil } from "@/lib/payments/orders";

export const metadata: Metadata = { title: "결제 완료 · INMYIN" };

// 결제 완료. 서버가 토스 승인까지 마친 뒤(/api/payments/toss/success)에만 이리로 보낸다.
// 주소에 실린 값은 없다 — 보이는 것은 모두 DB(plan · memberships)에서 읽는다
export default async function PlanSuccessPage() {
  const profile = await requireProfile();
  const isPremium = profile.plan === "premium";
  const until = isPremium ? await readPremiumUntil(profile.id) : null;
  return <PlanSuccessView isPremium={isPremium} until={until} />;
}
