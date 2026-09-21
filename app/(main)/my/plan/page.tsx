import type { Metadata } from "next";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "프리미엄 · INMYIN" };

// 임시 — 4단계에서 프리미엄 결제 화면으로 채운다
export default async function PlanPage() {
  await requireProfile();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <HeaderMini icon="back" href="/my/inventories" title="프리미엄" />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
        <p className="text-title font-bold">프리미엄은 준비 중이에요</p>
        <p className="text-body text-ink-muted">
          인벤토리 {PLANS.premium.maxInventories}개, 판마다 {PLANS.premium.slotCount}칸까지 늘릴 수 있게 됩니다.
        </p>
      </div>
    </div>
  );
}
