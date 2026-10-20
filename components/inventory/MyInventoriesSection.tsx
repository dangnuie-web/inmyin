import Link from "next/link";
import type { InventorySummary } from "@/lib/inventory/queries";
import { InventoryList } from "./InventoryList";
import { NumText } from "@/components/ui/NumText";

type MyInventoriesSectionProps = {
  inventories: InventorySummary[];
  maxInventories: number;
  slotCount: number;
};

// 내 인벤토리 목록의 몸통 — 전체 숫자 · 목록 · 다 찼을 때의 "늘리기". 폰의 M-03 과 웹의 프로필 › 인벤토리 탭이 같이 쓴다
export function MyInventoriesSection({ inventories, maxInventories, slotCount }: MyInventoriesSectionProps) {
  const isFull = inventories.length >= maxInventories;
  const usedTotal = inventories.reduce((sum, inventory) => sum + inventory.usedSlots, 0);

  return (
    <>
      {/* 상태라 버튼처럼 보이지 않게 회색 글자만 (무늬 흑백버튼설계 v01 3-5). 오른쪽 끝은 아래 줄들의 "n/25" 와 같은 20px 선 */}
      <p className="mt-4 flex justify-end pr-5 text-caption text-ink-muted">
        <NumText text={`전체 ${usedTotal}/${maxInventories * slotCount}`} />
      </p>

      <InventoryList inventories={inventories} maxInventories={maxInventories} />

      {isFull && (
        <Link
          href="/my/plan"
          className="mx-auto mt-auto mb-10 flex h-11.25 w-52 items-center justify-center gap-1 rounded-sm bg-ink text-link font-bold text-white active:opacity-80"
        >
          {/* 피그마에서도 그림이 아니라 글자(✦)다 */}
          <span aria-hidden>✦</span>
          인벤토리 늘리기
        </Link>
      )}
    </>
  );
}
