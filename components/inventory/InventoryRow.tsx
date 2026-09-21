import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { inventoryPath } from "@/lib/inventory/paths";
import type { InventorySummary } from "@/lib/inventory/queries";

// 인벤토리 목록(M-03)의 한 줄. 피그마 컴포넌트의 변형 세 가지 중
// 빈칸 · 인벤토리 있음 이 여기 있고, 추가(+)는 AddInventoryRow 에 있다.

// 줄 왼쪽의 네모 칸. 세 변형이 모두 쓴다
export function InventoryThumb({ filled = false, children }: { filled?: boolean; children?: ReactNode }) {
  return (
    <div
      className={`relative flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-sm ${
        filled ? "bg-gray-2" : "bg-gray-1"
      }`}
    >
      {children}
    </div>
  );
}

// 줄의 공통 틀 — 높이와 좌우 여백
export const INVENTORY_ROW_CLASS = "flex h-21.25 w-full items-center gap-7 pl-6.25 pr-11";

export function EmptyInventoryRow() {
  return (
    <li className={INVENTORY_ROW_CLASS} aria-hidden>
      <InventoryThumb />
    </li>
  );
}

// 누르면 그 인벤토리의 상세(M-04)로 간다
export function InventoryRow({ inventory }: { inventory: InventorySummary }) {
  return (
    <li>
      <Link href={inventoryPath(inventory.id)} className={`${INVENTORY_ROW_CLASS} active:opacity-60`}>
        <InventoryThumb filled>
          {inventory.imageUrl && (
            // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
            <Image src={inventory.imageUrl} alt="" fill sizes="52px" unoptimized className="object-cover" />
          )}
        </InventoryThumb>
        <p className="min-w-0 flex-1 truncate text-title font-bold">{inventory.name}</p>
        <p className="text-caption">
          {inventory.usedSlots}/{inventory.slotCount}
        </p>
      </Link>
    </li>
  );
}
