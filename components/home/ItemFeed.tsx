"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadMoreFeed } from "@/app/(main)/actions";
import { type GridColumns, gridColumnsClass, SlotCell, SlotRow } from "@/components/inventory/Slot";
import { ViewToggle } from "@/components/inventory/ViewToggle";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ChipRow } from "@/components/ui/ChipRow";
import { Icon } from "@/components/ui/Icon";
import { feedPath } from "@/lib/home/paths";
import { itemPath, type InventoryView } from "@/lib/inventory/paths";
import type { SlotEntry } from "@/lib/inventory/queries";
import { FEED_PAGE_SIZE, type FeedItem } from "@/lib/item/feed";

type ItemFeedProps = {
  // 첫 장. 최신순
  items: FeedItem[];
  // 주소에서 온 검색어와 카테고리 (서버가 이미 걸러서 items 를 보냈다)
  q: string;
  category: string | null;
  // 칩에 보일 태그들. 많이 쓰인 순
  categories: string[];
  columns: GridColumns;
};

// 글자를 치고 이만큼 멈추면 서버에 물어본다
const SEARCH_DELAY_MS = 350;

// H-01 · Home › 아이템 피드. 모아보기(M-13)와 같은 생김새지만, 남의 것이 계속 늘어나는 목록이라
// 검색 · 카테고리는 주소에 실어 서버가 거르고, 아래로는 "더 보기"로 한 장씩 더 읽는다
export function ItemFeed({ items, q, category, categories, columns }: ItemFeedProps) {
  const router = useRouter();
  const [view, setView] = useState<InventoryView>("grid");
  const [query, setQuery] = useState(q);
  const [pending, startTransition] = useTransition();
  // "더 보기"로 더 읽은 장들. 검색어나 카테고리가 바뀌어 첫 장이 새로 오면 버린다 — 그래서 어느 조건의 것인지 같이 적어 둔다
  const filterKey = `${q}\u0000${category ?? ""}`;
  const [more, setMore] = useState<{ key: string; items: FeedItem[]; ended: boolean }>({ key: filterKey, items: [], ended: false });
  const [loadingMore, setLoadingMore] = useState(false);
  const shown = more.key === filterKey ? [...items, ...more.items] : items;
  // 첫 장이 한 장 분량(60개)에 못 미치면 더 읽을 것이 없다. 더 읽은 장이 있으면 그 마지막 장이 정한다
  const ended = items.length < FEED_PAGE_SIZE || (more.key === filterKey && more.ended);

  // 검색어는 글자를 치는 동안 기다렸다가 주소에 싣는다. 주소가 바뀌면 서버가 새 첫 장을 보낸다
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function changeQuery(next: string) {
    setQuery(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(() => router.replace(feedPath({ q: next, category }), { scroll: false }));
    }, SEARCH_DELAY_MS);
  }

  async function loadMore() {
    const last = shown[shown.length - 1];
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadMoreFeed({ q, category: category ?? undefined, before: last.createdAt });
      setMore((current) => ({
        key: filterKey,
        items: [...(current.key === filterKey ? current.items : []), ...page],
        ended: page.length < FEED_PAGE_SIZE,
      }));
    } finally {
      setLoadingMore(false);
    }
  }

  // 주소로 온 카테고리가 인기 칩에 없어도 칩으로 보인다 — 고른 것이 안 보이면 왜 걸러졌는지 모른다
  const chips = category && !categories.includes(category) ? [category, ...categories] : categories;
  const isFiltered = Boolean(category || q.trim());
  const toEntry = (item: FeedItem): SlotEntry => ({ kind: "item", deleted: false, ...item });

  return (
    <div className="flex flex-1 flex-col">
      {/* 갈래의 밑줄과 검색창 사이 20px */}
      <div className="mt-5 flex items-center gap-6 px-5">
        <label className="flex h-7.5 min-w-0 flex-1 items-center gap-2 rounded-full border border-border pl-4 pr-4">
          {/* 아이폰은 16px 보다 작은 입력칸을 누르면 화면을 멋대로 확대한다 */}
          <input
            type="search"
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            aria-label="아이템 이름으로 찾기"
            enterKeyHint="search"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-body outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          <Icon name="search" className={`shrink-0 ${pending ? "animate-pulse" : ""}`} />
        </label>
        <ViewToggle current={view} onSelect={setView} />
      </div>

      <ChipRow className="mt-3 pl-5">
        <CategoryTag label="전체" selected={!category} href={feedPath({ q })} />
        {chips.map((tag) => (
          <CategoryTag key={tag} label={tag} selected={tag === category} href={feedPath({ q, category: tag === category ? null : tag })} />
        ))}
      </ChipRow>

      {shown.length === 0 ? (
        <p className="mt-16 break-keep px-5 text-center text-label text-ink-muted">
          {isFiltered ? "찾는 아이템이 없어요." : "아직 공개된 아이템이 없어요. 내 인벤토리에 넣은 것이 여기에 모여요."}
        </p>
      ) : view === "grid" ? (
        <ul className={`mt-8 grid gap-3.5 px-5 ${gridColumnsClass(columns)}`}>
          {shown.map((item) => (
            <li key={item.id}>
              <SlotCell entry={toEntry(item)} href={itemPath(item.id, { from: "home", q, category })} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-5 flex flex-col border-t border-border">
          {shown.map((item) => (
            // 누구의 어느 인벤토리에 있는지. 여러 사람의 것이 섞이는 화면이라 이름 아래에 적는다
            <li key={item.id}>
              <SlotRow entry={toEntry(item)} caption={`${item.ownerNickname} · ${item.inventoryName}`} href={itemPath(item.id, { from: "home", q, category })} />
            </li>
          ))}
        </ul>
      )}

      {!ended && shown.length > 0 && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mx-auto mt-8 mb-6 h-10 rounded-full border border-disabled px-6 text-label font-semibold active:opacity-60 disabled:text-disabled"
        >
          {loadingMore ? "읽는 중…" : "더 보기"}
        </button>
      )}
    </div>
  );
}
