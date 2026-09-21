"use client";

import { useState } from "react";
import { SlotCell, SlotRow } from "@/components/inventory/Slot";
import { ViewToggle } from "@/components/inventory/ViewToggle";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ChipRow } from "@/components/ui/ChipRow";
import { Icon } from "@/components/ui/Icon";
import type { InventoryView } from "@/lib/inventory/paths";
import type { SlotEntry } from "@/lib/inventory/queries";
import type { CollectedItem } from "@/lib/item/queries";

type ItemCollectionProps = {
  // 최신순으로 온다
  items: CollectedItem[];
  // 넣을 수 있는 전체 칸 수 (인벤토리 한도 × 칸 수). 아래의 3/125 에 쓴다
  capacity: number;
};

// M-13 · 아이템 모아보기. 인벤토리 구분 없이 아이템 전체를 최신순으로 본다.
// 검색과 카테고리는 서버를 거치지 않고 여기서 바로 거른다 — 글자를 칠 때마다, 칩을 누를 때마다 즉시 바뀐다.
export function ItemCollection({ items, capacity }: ItemCollectionProps) {
  const [view, setView] = useState<InventoryView>("grid");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  // 인벤토리마다 따로 달린 태그를 이름으로 합친다. 아이템이 많은 태그가 앞에 온다 — 쓸어 넘기지 않아도 대부분 해결되게
  const counts = new Map<string, number>();
  for (const item of items) if (item.category) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  const categories = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b, "ko"));

  const words = query.trim().toLowerCase();
  // 태그가 없는 아이템은 전체에서만 보인다 (CLAUDE.md 규칙 4)
  const shown = items.filter((item) => (!category || item.category === category) && (!words || item.name.toLowerCase().includes(words)));
  const isFiltered = Boolean(category || words);

  const toEntry = (item: CollectedItem): SlotEntry => ({ kind: "item", deleted: false, ...item });

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-6 pl-4 pr-4.5">
        <label className="flex h-7.5 min-w-0 flex-1 items-center gap-2 rounded-full border border-border pl-4 pr-4">
          {/* 아이폰은 16px 보다 작은 입력칸을 누르면 화면을 멋대로 확대한다 */}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="아이템 이름으로 찾기"
            enterKeyHint="search"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-body outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          <Icon name="search" className="shrink-0" />
        </label>
        <ViewToggle current={view} onSelect={setView} />
      </div>

      <ChipRow className="mt-3 pl-4">
        <CategoryTag label="전체" selected={!category} onClick={() => setCategory(null)} />
        {categories.map((tag) => (
          <CategoryTag key={tag} label={tag} selected={tag === category} onClick={() => setCategory(tag === category ? null : tag)} />
        ))}
      </ChipRow>

      {shown.length === 0 ? (
        <p className="mt-16 break-keep px-6 text-center text-label text-ink-muted">
          {isFiltered ? "찾는 아이템이 없어요." : "아직 등록한 아이템이 없어요. 인벤토리에서 + 를 눌러 넣어 보세요."}
        </p>
      ) : view === "grid" ? (
        <ul className="mt-8 grid grid-cols-3 gap-3.5 px-6.5">
          {shown.map((item) => (
            <li key={item.id}>
              <SlotCell entry={toEntry(item)} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-5 flex flex-col border-t border-border">
          {shown.map((item) => (
            <li key={item.id}>
              <SlotRow entry={toEntry(item)} caption={item.inventoryName} />
            </li>
          ))}
        </ul>
      )}

      {/* 화면 아래에 붙어 있는 숫자. 거르고 있을 때는 찾은 개수를, 아니면 전체 사용량을 보여준다 */}
      <div className="pointer-events-none sticky bottom-0 mt-auto flex h-19 items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <p className="rounded-full bg-white px-3 py-0.5 text-label font-bold">{isFiltered ? `${shown.length}개` : `${items.length}/${capacity}`}</p>
      </div>
    </div>
  );
}
