"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { InventoryChoice } from "@/lib/inventory/queries";
import { hasRoom } from "@/lib/inventory/target";
import { InventoryChoiceRow } from "./InventoryChoiceRow";

type InventoryTargetSheetProps = {
  // 내 인벤토리 전부, 인벤토리 관리(M-03)와 같은 순서. 고른 것을 맨 위로 올리지 않는다 — 열 때마다 순서가 바뀌면 손이 기억을 못 한다
  inventories: InventoryChoice[];
  selectedId: string;
  onPick: (inventory: InventoryChoice) => void;
  onClose: () => void;
};

// 아이템 정보 입력(M-08) 맨 위 "넣을 곳" 줄을 누르면 아래에서 올라오는 판 (무늬 인벤토리고르기설계 v01 2-3).
// "인벤토리 가져오기"(InventoryPicker)와 같은 틀 · 같은 줄. 누르면 바로 고르고 닫힌다(확인 버튼 없음).
// 꽉 찬 것은 빼지 않고 흐리게 — 빠지면 "어디 갔지"를 찾는다. 판 안에 다른 화면으로 가는 길은 두지 않는다 — 사진이 메모리에만 있어서 떠나면 잃는다.
// 열리면 고른 줄에 포커스 · 그 줄이 보이게 스크롤. ↑↓ 로 줄 이동, Enter 로 고르기, Esc · 바깥 누르기로 닫기
export function InventoryTargetSheet({ inventories, selectedId, onPick, onClose }: InventoryTargetSheetProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const names = new Map(inventories.map((inventory) => [inventory.id, inventory.name]));

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLButtonElement>("[aria-current]:not(:disabled)") ?? rowsOf(listRef.current)[0];
    selected?.scrollIntoView({ block: "nearest" });
    selected?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      return onClose();
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const list = rowsOf(listRef.current);
    const at = list.indexOf(document.activeElement as HTMLButtonElement);
    const next = list[at < 0 ? 0 : Math.min(list.length - 1, Math.max(0, at + (event.key === "ArrowDown" ? 1 : -1)))];
    next?.focus();
    next?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end" onKeyDown={onKeyDown}>
      <button type="button" aria-label="닫기" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-ink/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-target-title"
        className="relative mx-auto flex max-h-[70dvh] w-full max-w-md flex-col rounded-t-xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink"
      >
        <h2 id="inventory-target-title" className="px-5 pt-7 text-link font-bold">
          넣을 곳
        </h2>
        <p className="px-5 pt-1 text-caption text-ink-muted">고른 인벤토리의 맨 뒤 칸에 들어가요.</p>

        <ul ref={listRef} className="mt-3 flex flex-col overflow-y-auto">
          {inventories.map((inventory) => {
            const full = !hasRoom(inventory);
            const parentName = inventory.parentId ? names.get(inventory.parentId) : undefined;
            return (
              <li key={inventory.id}>
                <InventoryChoiceRow
                  inventory={inventory}
                  caption={full ? "칸이 가득 찼어요" : parentName ? `${parentName} 안` : null}
                  disabled={full}
                  selected={inventory.id === selectedId}
                  onSelect={() => onPick(inventory)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// 고를 수 있는 줄(꽉 찬 것 빼고)
function rowsOf(list: HTMLUListElement | null) {
  return [...(list?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
}
