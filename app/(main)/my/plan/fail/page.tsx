import type { Metadata } from "next";
import { PlanFailView } from "@/components/plan/PlanScreens";
import { requireProfile } from "@/lib/auth/profile";

export const metadata: Metadata = { title: "결제 안 됨 · INMYIN" };

// 결제 실패 · 취소. 토스 결제창의 failUrl(?code=&message=&orderId=), 서버 승인이 안 됐을 때(/api/payments/toss/success), 컴퓨터 결제창을 닫았을 때(USER_CANCEL).
// 이 화면에서는 아무것도 바꾸지 않는다
export default async function PlanFailPage(props: PageProps<"/my/plan/fail">) {
  await requireProfile();
  const { code } = await props.searchParams;
  return <PlanFailView code={typeof code === "string" ? code.slice(0, 64) : ""} />;
}
