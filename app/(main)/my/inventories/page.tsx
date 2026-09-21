import type { Metadata } from "next";
import Link from "next/link";
import { AddInventoryRow } from "@/components/inventory/AddInventoryRow";
import { EmptyInventoryRow, InventoryRow } from "@/components/inventory/InventoryRow";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getMyInventories } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

// M-03 · My › 인벤토리 목록.
// 플랜의 인벤토리 한도만큼 줄을 그린다 — 있는 것, + 하나, 나머지는 빈 칸
export default async function InventoriesPage() {
  const profile = await requireProfile();
  const inventories = await getMyInventories(profile.id);
  const { maxInventories, slotCount } = planLimits(profile.plan);

  const isFull = inventories.length >= maxInventories;
  const emptyRows = Math.max(0, maxInventories - inventories.length - 1);
  const usedTotal = inventories.reduce((sum, inventory) => sum + inventory.usedSlots, 0);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <HeaderMini icon="back" href="/my" title="INVENTORY" />

      <p className="mt-4 pr-7 text-right text-body font-bold">
        TOTAL {usedTotal}/{maxInventories * slotCount}
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {inventories.map((inventory) => (
          <InventoryRow key={inventory.id} inventory={inventory} />
        ))}
        {!isFull && <AddInventoryRow />}
        {Array.from({ length: emptyRows }, (_, index) => (
          <EmptyInventoryRow key={index} />
        ))}
      </ul>

      {isFull && (
        <Link
          href="/my/plan"
          className="mx-auto mt-auto mb-10 flex h-11.25 w-52 items-center justify-center gap-1 rounded-sm bg-point text-link font-bold text-white active:opacity-80"
        >
          {/* 임시 — 피그마의 반짝이 아이콘 SVG를 받으면 바꾼다 */}
          <span aria-hidden>✦</span>
          인벤토리 늘리기
        </Link>
      )}
    </div>
  );
}
