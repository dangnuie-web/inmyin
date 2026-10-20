import type { ComponentProps } from "react";
import { Icon } from "@/components/ui/Icon";
import type { InventorySummary } from "@/lib/inventory/queries";
import { INVENTORY_ROW_CLASS, InventoryPhoto } from "./InventoryRow";

type InventoryChoiceRowProps = Omit<ComponentProps<"button">, "children" | "onClick" | "className"> & {
  inventory: Pick<InventorySummary, "name" | "imageUrl" | "usedSlots" | "slotCount">;
  // 이름 아래 한 줄. 못 고르는 이유("칸이 가득 찼어요") 또는 담긴 곳("데스크 안")
  caption?: string | null;
  // 못 고름 — 사진 · 이름 · 숫자가 흐려진다. 이유(caption)는 흐리지 않는다
  disabled?: boolean;
  // 고른 줄이면 true, 안 고른 줄이면 false — 둘 다 오른쪽 끝에 ✓ 자리(24)를 둔다(숫자 열이 한 줄로 서게).
  // 주지 않으면 ✓ 자리가 없다 (인벤토리 가져오기)
  selected?: boolean;
  onSelect: () => void;
};

// 아래에서 올라오는 판에서 인벤토리 하나를 고르는 줄 — 사진 · 이름 · 캡션 · 12/25 · ✓.
// "인벤토리 가져오기"(InventoryPicker)와 "넣을 곳"(InventoryTargetSheet)이 같이 쓴다 — 두 판의 줄 모양이 같아야 배우는 게 하나다
export function InventoryChoiceRow({ inventory, caption, disabled = false, selected, onSelect, ...props }: InventoryChoiceRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-current={selected || undefined}
      className={`${INVENTORY_ROW_CLASS} text-left outline-none focus-visible:bg-gray-1 active:opacity-60 ${selected ? "bg-gray-2 focus-visible:bg-gray-2" : ""}`}
      {...props}
    >
      <span className={disabled ? "opacity-30" : ""}>
        <InventoryPhoto inventory={inventory} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate text-title font-bold ${disabled ? "text-disabled" : ""}`}>{inventory.name}</span>
        {caption && <span className="truncate text-caption text-ink-muted">{caption}</span>}
      </span>
      <span className={`num text-caption ${disabled ? "text-disabled" : ""}`}>
        {inventory.usedSlots}/{inventory.slotCount}
      </span>
      {selected !== undefined && (
        <span className="-ml-3 flex size-6 shrink-0 items-center justify-center">{selected && <Icon name="check24" />}</span>
      )}
    </button>
  );
}
