import type { Metadata } from "next";
import { PlanView } from "@/components/plan/PlanScreens";
import { requireProfile } from "@/lib/auth/profile";
import { returnToFrom } from "@/lib/nav/return-to";
import { readPremiumUntil } from "@/lib/payments/orders";

export const metadata: Metadata = { title: "프리미엄 · INMYIN" };

// 프리미엄(플랜) 화면. 설정의 "프리미엄 보기 · 이용 기간", 한도에 닿았을 때의 "늘리기"에서 온다.
// 베이직: 한도 비교 + 월 2,900원 한 달 이용권 결제(토스 결제창, 4단계는 테스트 모드). 프리미엄: 언제까지인지.
// 자동 결제 · 해지는 아직 없다(한 번 결제 = 한 달). 뒤로는 온 곳(?back=), 없으면 인벤토리 관리
export default async function PlanPage(props: PageProps<"/my/plan">) {
  const profile = await requireProfile();
  const back = returnToFrom(await props.searchParams);
  const isPremium = profile.plan === "premium";
  const until = isPremium ? await readPremiumUntil(profile.id) : null;
  return <PlanView isPremium={isPremium} until={until} back={back ?? "/my/inventories"} />;
}
