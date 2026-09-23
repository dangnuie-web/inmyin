"use client";

import Image from "next/image";
import { useState } from "react";
import { InventoryStrip } from "@/components/inventory/InventoryStrip";
import { gridFor, type GridColumns, PackingSlotCell, SLOT_ROW_CLASS, SlotRowThumb } from "@/components/inventory/Slot";
import { ViewToggle } from "@/components/inventory/ViewToggle";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ChipRow } from "@/components/ui/ChipRow";
import type { InventoryView } from "@/lib/inventory/paths";
import type { PackingInventory, SlotEntry } from "@/lib/inventory/queries";

type ItemPickerProps = {
  inventories: PackingInventory[];
  columns: GridColumns;
  // 이미 캔버스에 올라간 아이템. 칸이 회색으로 보인다 (피그마의 "고른 칸")
  placedItemIds: Set<string>;
  onPick: (entry: SlotEntry) => void;
};

// 에디터(M-09)의 아이템 고르기 — 인벤토리 띠 → 그리드/리스트 토글 + 카테고리 칩 → 칸들 → n/25.
// 짐싸기 판(PackingHalf)과 같은 꼴이고, 칸을 누르면 캔버스에 올라간다. 담긴 인벤토리는 올릴 수 없어 빠진다
export function ItemPicker({ inventories, columns, placedItemIds, onPick }: ItemPickerProps) {
  const [openId, setOpenId] = useState<string | null>(inventories[0]?.id ?? null);
  const [view, setView] = useState<InventoryView>("grid");
  const [category, setCategory] = useState<string | null>(null);
  const inventory = inventories.find((candidate) => candidate.id === openId) ?? null;

  if (!inventory) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center px-5 text-center">
        <p className="break-keep text-label text-ink-muted">캔버스에 올릴 아이템이 없어요. 인벤토리를 먼저 만들어 주세요.</p>
      </section>
    );
  }

  const items = inventory.entries.filter((entry) => entry.kind === "item");
  const shown = category ? items.filter((entry) => entry.category === category) : items;

  return (
    <section aria-label="아이템 고르기" className="relative flex min-h-0 flex-1 flex-col border-t border-gray-3">
      <div className="mt-2.5">
        <InventoryStrip
          inventories={inventories}
          currentId={inventory.id}
          onSelect={(id) => {
            setOpenId(id);
            setCategory(null);
          }}
        />
      </div>

      {/* 피그마: 토글 · 칩 한 줄 (M-04 와 같은 부품) */}
      <div className="mt-3 flex items-center gap-2.5 pl-5">
        <ViewToggle current={view} onSelect={setView} />
        <ChipRow>
          <CategoryTag label="전체" selected={category === null} onClick={() => setCategory(null)} />
          {inventory.categories.map((tag) => (
            <CategoryTag key={tag} label={tag} selected={category === tag} onClick={() => setCategory(tag)} />
          ))}
        </ChipRow>
      </div>

      {shown.length === 0 ? (
        <p className="mt-8 px-5 text-center text-label text-ink-muted">{items.length === 0 ? "이 인벤토리에는 아이템이 없어요." : "이 태그의 아이템이 없어요."}</p>
      ) : view === "grid" ? (
        // 아래 여백 — 맨 아랫줄이 떠 있는 n/25 에 가리지 않게
        <ul className={`mt-4 grid min-h-0 flex-1 content-start gap-3.5 overflow-y-auto px-5 pb-10 ${gridFor(inventory.slotCount, columns).className}`}>
          {shown.map((entry) => (
            <li key={entry.id} className={placedItemIds.has(entry.id) ? "rounded-sm ring-2 ring-gray-3" : ""}>
              <PackingSlotCell entry={entry} onPick={() => onPick(entry)} actionLabel="올리기" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 min-h-0 flex-1 overflow-y-auto pb-10">
          {shown.map((entry) => (
            <li key={entry.id}>
              <button type="button" onClick={() => onPick(entry)} className={`${SLOT_ROW_CLASS} text-left active:opacity-80 ${placedItemIds.has(entry.id) ? "bg-gray-1" : ""}`}>
                <SlotRowThumb filled>
                  {entry.imageUrl && <Image src={entry.imageUrl} alt="" fill sizes="54px" unoptimized className="object-cover" />}
                </SlotRowThumb>
                <span className="min-w-0 flex-1 truncate text-body">{entry.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="pointer-events-none absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-white px-3 py-0.5 text-label font-bold">
        {items.length}/{inventory.slotCount}
      </p>
    </section>
  );
}
