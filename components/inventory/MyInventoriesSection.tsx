import Link from "next/link";
import type { InventorySummary } from "@/lib/inventory/queries";
import { InventoryList } from "./InventoryList";

type MyInventoriesSectionProps = {
  inventories: InventorySummary[];
  maxInventories: number;
  slotCount: number;
};

// 내 인벤토리 목록의 몸통 — TOTAL 알약 · 목록 · 다 찼을 때의 "늘리기". 폰의 M-03 과 웹의 프로필 › INVENTORY 탭이 같이 쓴다
export function MyInventoriesSection({ inventories, maxInventories, slotCount }: MyInventoriesSectionProps) {
  const isFull = inventories.length >= maxInventories;
  const usedTotal = inventories.reduce((sum, inventory) => sum + inventory.usedSlots, 0);

  return (
    <>
      {/* 검정 알약 안의 작은 글자. 오른쪽 끝은 아래 줄들의 "n/25" 와 같은 20px 선 */}
      <p className="mt-4 flex justify-end pr-5">
        <span className="rounded-full bg-ink px-3 py-1 text-caption font-bold text-white">
          TOTAL {usedTotal}/{maxInventories * slotCount}
        </span>
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
    </>
  );
}
