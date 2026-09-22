import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { inventoryPath } from "@/lib/inventory/paths";
import type { InventorySummary } from "@/lib/inventory/queries";

// 인벤토리 목록(M-03)의 한 줄. 피그마 컴포넌트의 변형 중 `인벤토리 있음` 이 여기 있고,
// `추가`(+)는 AddInventoryRow 에 있다. `빈칸` 은 그리지 않기로 했다.

// 줄 왼쪽의 네모 칸. 사진이 든 칸은 filled
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

export function InventoryPhoto({ inventory }: { inventory: Pick<InventorySummary, "imageUrl"> }) {
  return (
    <InventoryThumb filled>
      {inventory.imageUrl && (
        // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
        <Image src={inventory.imageUrl} alt="" fill sizes="52px" unoptimized draggable={false} className="object-cover" />
      )}
    </InventoryThumb>
  );
}

// 누르면 그 인벤토리의 상세(M-04)로 간다. 밀어서 수정 · 삭제하는 줄이라, 브라우저가 끼어들지 않게 한다 —
// 아이폰의 링크 미리보기, 글자 선택, 링크 끌어가기
export function InventoryRow({ inventory }: { inventory: InventorySummary }) {
  return (
    <Link
      href={inventoryPath(inventory.id)}
      draggable={false}
      className={`${INVENTORY_ROW_CLASS} select-none [-webkit-touch-callout:none] active:opacity-60`}
    >
      <InventoryPhoto inventory={inventory} />
      <p className="min-w-0 flex-1 truncate text-title font-bold">{inventory.name}</p>
      <p className="text-caption">
        {inventory.usedSlots}/{inventory.slotCount}
      </p>
    </Link>
  );
}

// 방금 지운 인벤토리의 자리. 아이템과 똑같이 5초 동안 "되돌리기" 줄로 남았다가 사라진다 (components/inventory/Slot.tsx)
export function UndoInventoryRow({ inventory, onUndo }: { inventory: InventorySummary; onUndo: () => void }) {
  return (
    <button type="button" onClick={onUndo} className={`${INVENTORY_ROW_CLASS} relative text-left active:opacity-80`}>
      <span className="opacity-25 grayscale">
        <InventoryPhoto inventory={inventory} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-title font-bold text-disabled">{inventory.name}</span>
        <span className="text-caption text-ink-muted">삭제했어요</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-label font-bold text-point">
        <Icon name="undo" scale={0.45} />
        되돌리기
      </span>
      <span className="absolute inset-x-0 bottom-0 h-0.75 origin-left animate-undo-countdown bg-point" />
    </button>
  );
}
