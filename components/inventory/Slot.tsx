import Image from "next/image";
import type { ReactNode } from "react";
import type { SlotEntry } from "@/lib/inventory/queries";

// 인벤토리 상세(M-04)의 한 칸. 피그마 `아이템 슬롯` 컴포넌트.
// 같은 내용을 그리드에서는 네모 칸(SlotCell)으로, 리스트에서는 한 줄(SlotRow)로 그린다.

// 개수 배지 "× n". 하나뿐이면 그리지 않는다
function QuantityBadge({ quantity, className }: { quantity: number; className: string }) {
  if (quantity <= 1) return null;
  return <span className={`rounded-full px-2 text-caption ${className}`}>× {quantity}</span>;
}

function SlotImage({ entry, sizes }: { entry: SlotEntry; sizes: string }) {
  if (!entry.imageUrl) return null;
  // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
  return <Image src={entry.imageUrl} alt={entry.name} fill sizes={sizes} unoptimized className="object-cover" />;
}

const CELL_CLASS = "relative flex aspect-square items-center justify-center rounded-sm";

// 그리드의 + 칸. 메뉴가 칸 밖으로 펼쳐져야 해서 넘치는 부분을 자르지 않는다.
// (빈 칸은 그리지 않는다 — 채워진 칸과 그 다음의 + 칸만 보인다)
export function AddSlotCell({ children }: { children: ReactNode }) {
  return <div className={`${CELL_CLASS} bg-gray-1`}>{children}</div>;
}

export function SlotCell({ entry }: { entry: SlotEntry }) {
  return (
    <div className={`${CELL_CLASS} overflow-hidden bg-gray-2`}>
      <SlotImage entry={entry} sizes="(min-width: 448px) 130px, 30vw" />
      <QuantityBadge quantity={entry.quantity} className="absolute bottom-2 right-2 bg-white" />
    </div>
  );
}

export const SLOT_ROW_CLASS = "flex h-25 w-full items-center gap-8 border-b border-border pl-5.25 pr-4.5";

// 리스트 줄 왼쪽의 네모 칸
export function SlotRowThumb({ filled = false, children }: { filled?: boolean; children?: ReactNode }) {
  return (
    <div
      className={`relative flex size-13.5 shrink-0 items-center justify-center overflow-hidden rounded-sm ${
        filled ? "bg-gray-2" : "bg-gray-1"
      }`}
    >
      {children}
    </div>
  );
}

export function SlotRow({ entry }: { entry: SlotEntry }) {
  return (
    <div className={SLOT_ROW_CLASS}>
      <SlotRowThumb filled>
        <SlotImage entry={entry} sizes="54px" />
      </SlotRowThumb>
      <p className="min-w-0 flex-1 truncate text-body">{entry.name}</p>
      <QuantityBadge quantity={entry.quantity} className="bg-gray-1" />
    </div>
  );
}
