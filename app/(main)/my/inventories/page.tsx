import type { Metadata } from "next";
import Link from "next/link";
import { InventoryList } from "@/components/inventory/InventoryList";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getMyInventories } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

// M-03 · My › 인벤토리 목록.
// 있는 인벤토리와 그 다음의 + 줄 하나만 그린다. 빈 자리는 그리지 않는다. 줄을 밀면 수정 · 삭제 (InventoryList)
export default async function InventoriesPage() {
  const profile = await requireProfile();
  const inventories = await getMyInventories(profile.id);
  const { maxInventories, slotCount } = planLimits(profile.plan);

  const isFull = inventories.length >= maxInventories;
  const usedTotal = inventories.reduce((sum, inventory) => sum + inventory.usedSlots, 0);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <HeaderMini icon="back" href="/my" title="INVENTORY" />

      <p className="mt-4 pr-7 text-right text-body font-bold">
        TOTAL {usedTotal}/{maxInventories * slotCount}
      </p>

      <InventoryList inventories={inventories} maxInventories={maxInventories} />

      {isFull && (
        <Link
          href="/my/plan"
          className="mx-auto mt-auto mb-10 flex h-11.25 w-52 items-center justify-center gap-1 rounded-sm bg-point text-link font-bold text-white active:opacity-80"
        >
          {/* 피그마에서도 그림이 아니라 글자(✦)다 */}
          <span aria-hidden>✦</span>
          인벤토리 늘리기
        </Link>
      )}
    </div>
  );
}
