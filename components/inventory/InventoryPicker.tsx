"use client";

import { nestingBlocker } from "@/lib/inventory/nesting";
import type { InventorySummary } from "@/lib/inventory/queries";
import { INVENTORY_ROW_CLASS, InventoryPhoto } from "./InventoryRow";

type InventoryPickerProps = {
  // 내 인벤토리 전부
  inventories: InventorySummary[];
  // 담을 곳 (지금 보고 있는 인벤토리)
  intoId: string;
  onPick: (inventory: InventorySummary) => void;
  onClose: () => void;
};

// "인벤토리 가져오기" (M-04 의 + 메뉴). 아래에서 올라오는 목록에서 하나를 고르면 그 인벤토리가 통째로 이 칸에 담긴다.
// 담을 수 없는 것은 흐리게 보이고, 왜 안 되는지가 이름 아래에 적힌다 — 그냥 빼 버리면 어디 갔는지 찾게 된다
export function InventoryPicker({ inventories, intoId, onPick, onClose }: InventoryPickerProps) {
  const into = inventories.find((inventory) => inventory.id === intoId);
  const others = inventories.filter((inventory) => inventory.id !== intoId);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/40" />
      <div
        role="dialog"
        aria-label="인벤토리 가져오기"
        className="relative mx-auto flex max-h-[70dvh] w-full max-w-md flex-col rounded-t-xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <h2 className="px-6.25 pt-7 text-link font-bold">인벤토리 가져오기</h2>
        <p className="px-6.25 pt-1 text-caption text-ink-muted">고른 인벤토리가 안에 든 것과 함께 통째로 이 칸에 담겨요.</p>

        {into && others.length > 0 ? (
          <ul className="mt-3 flex flex-col overflow-y-auto">
            {others.map((inventory) => {
              const blocker = nestingBlocker(inventory, into, inventories);
              return (
                <li key={inventory.id}>
                  <button
                    type="button"
                    onClick={() => onPick(inventory)}
                    disabled={blocker !== null}
                    className={`${INVENTORY_ROW_CLASS} text-left active:opacity-60`}
                  >
                    <span className={blocker ? "opacity-30" : ""}>
                      <InventoryPhoto inventory={inventory} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={`truncate text-title font-bold ${blocker ? "text-disabled" : ""}`}>{inventory.name}</span>
                      {blocker && <span className="truncate text-caption text-ink-muted">{blocker}</span>}
                    </span>
                    <span className={`text-caption ${blocker ? "text-disabled" : ""}`}>
                      {inventory.usedSlots}/{inventory.slotCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-6.25 py-10 text-center text-label text-ink-muted">가져올 다른 인벤토리가 없어요.</p>
        )}
      </div>
    </div>
  );
}
