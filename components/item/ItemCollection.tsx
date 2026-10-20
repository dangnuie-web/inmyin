"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AddSlotButton, AddSlotCell, type GridColumns, gridColumnsClass, SlotCell, SlotRow } from "@/components/inventory/Slot";
import { ViewToggle } from "@/components/inventory/ViewToggle";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ChipRow } from "@/components/ui/ChipRow";
import { Icon } from "@/components/ui/Icon";
import { EmptyBag, EmptyLine, type EmptyState } from "@/components/ui/EmptyBag";
import { ListControls } from "@/components/ui/ListControls";
import type { InventoryView } from "@/lib/inventory/paths";
import type { SlotEntry } from "@/lib/inventory/queries";
import type { CollectedItem } from "@/lib/item/queries";
import { NumText } from "@/components/ui/NumText";
import { useAddItem } from "./useAddItem";

type ItemCollectionProps = {
  // 최신순으로 온다
  items: CollectedItem[];
  // 넣을 수 있는 전체 칸 수 (인벤토리 한도 × 칸 수). 목록 위의 3/125 에 쓴다. 남의 것(타유저 프로필)은 한도를 보여주지 않으므로 null — 개수만
  capacity: number | null;
  // 격자 한 줄의 칸 수 (Slot.tsx 의 gridFor)
  columns: GridColumns;
  // 아이템이 하나도 없을 때의 빈 가방 — 글 · 버튼. 화면마다 다르다 (내 것 · 남의 것 · 북마크). 걸러서 0개면 가방 없이 글 한 줄
  empty: EmptyState;
  // "최신순 | 오래된순" 정렬을 보여줄지 (북마크 탭). items 는 최근 것부터 온다고 본다
  sortable?: boolean;
  // 맨 뒤에 + 칸을 둘지 — 내 것(/my/items)만. 남의 아이템 · 북마크는 없다 (무늬 인벤토리고르기설계 v01 5절)
  addable?: boolean;
  // 넣을 곳이 있는가 (인벤토리가 없거나, 빈 칸 있는 인벤토리가 하나라도 있다). 아니면 + 대신 "프리미엄으로 늘리기" 링크
  canAdd?: boolean;
};

// M-13 · 아이템 모아보기. 인벤토리 구분 없이 아이템 전체를 최신순으로 본다.
// 검색과 카테고리는 서버를 거치지 않고 여기서 바로 거른다 — 글자를 칠 때마다, 칩을 누를 때마다 즉시 바뀐다.
// 내 것(addable)이면 격자 맨 뒤에 + 칸(리스트는 + 줄) — 인벤토리 격자와 같은 칸. 누르면 넣을 인벤토리는 /add 가 골라 두고(칩을 골랐으면 그 카테고리가 많은 곳)
// 정보 입력(M-08)에서 바꾼다. + 칸이 스크롤로 화면 밖이면 오른쪽 아래에 떠 있는 + . 검색 중에는 + 를 숨긴다 — 결과 끝의 + 는 "검색 결과에 넣는다"로 읽힌다
export function ItemCollection({ items, capacity, columns, empty, sortable = false, addable = false, canAdd = true }: ItemCollectionProps) {
  const [view, setView] = useState<InventoryView>("grid");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  // 인벤토리마다 따로 달린 태그를 이름으로 합친다. 아이템이 많은 태그가 앞에 온다 — 쓸어 넘기지 않아도 대부분 해결되게
  const counts = new Map<string, number>();
  for (const item of items) if (item.category) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  const categories = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b, "ko"));

  const words = query.trim().toLowerCase();
  // 태그가 없는 아이템은 전체에서만 보인다 (CLAUDE.md 규칙 4)
  const filtered = items.filter((item) => (!category || item.category === category) && (!words || item.name.toLowerCase().includes(words)));
  const shown = oldestFirst ? [...filtered].reverse() : filtered;
  const isFiltered = Boolean(category || words);

  const toEntry = (item: CollectedItem): SlotEntry => ({ kind: "item", deleted: false, ...item });

  const addItem = useAddItem({ category });
  const showAdd = addable && canAdd && !words && shown.length > 0;
  const addSlotRef = useRef<HTMLLIElement>(null);
  const [addSlotVisible, setAddSlotVisible] = useState(true);
  useEffect(() => {
    const target = addSlotRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setAddSlotVisible(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [view, showAdd]);

  return (
    // 아래 여백 40 — 전에는 바닥 숫자 줄(76)이 이 자리를 잡아 줬다
    <div className="flex flex-1 flex-col pb-10">
      {/* 토글은 검색창 왼쪽 — 써 보니 그쪽이 편했다 (M-04 와 같은 자리). 웹에서는 칩 · 검색 · 토글 순 (ListControls) */}
      <ListControls
        toggle={<ViewToggle current={view} onSelect={setView} />}
        search={
          <label className="flex h-7.5 min-w-0 items-center gap-2 rounded-full border border-border pl-4 pr-4">
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
            <Icon name="search" scale={0.75} className="shrink-0" />
          </label>
        }
        chips={
          <ChipRow className="pl-5 lg:pl-0">
            <CategoryTag label="전체" selected={!category} onClick={() => setCategory(null)} />
            {categories.map((tag) => (
              <CategoryTag key={tag} label={tag} selected={tag === category} onClick={() => setCategory(tag === category ? null : tag)} />
            ))}
          </ChipRow>
        }
      />

      {/* 목록 바로 위 왼쪽에 사용량 — 거르고 있을 때는 찾은 개수 (무늬 빈화면프로필설계 v01 5절. 전에는 화면 바닥 알약).
          비어서 빈 가방이 설 때도 남겨 한도를 알린다(0/500). 북마크는 오른쪽 끝에 "최신순 | 오래된순"(정렬 문구는 "~순" 붙여 씀). 고른 쪽이 검정 */}
      <div className="mt-4 flex h-6 items-center px-5 text-caption text-ink-muted">
        <NumText text={isFiltered || capacity === null ? `${shown.length}개` : `${items.length}/${capacity}`} />
        {sortable && (
          <p className="ml-auto flex gap-2">
            <button type="button" onClick={() => setOldestFirst(false)} aria-pressed={!oldestFirst} className={`font-bold ${oldestFirst ? "text-ink-muted" : "text-ink"}`}>
              최신순
            </button>
            <span aria-hidden className="text-gray-3">|</span>
            <button type="button" onClick={() => setOldestFirst(true)} aria-pressed={oldestFirst} className={`font-bold ${oldestFirst ? "text-ink" : "text-ink-muted"}`}>
              오래된순
            </button>
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        isFiltered ? (
          <EmptyLine>찾는 아이템이 없어요.</EmptyLine>
        ) : (
          // 내 것이면 "아이템 넣기"도 + 칸과 같은 갈림(폰 촬영 · 컴퓨터 파일 창)으로
          <EmptyBag action={addable && empty.action ? { label: empty.action.label, onClick: addItem.start } : empty.action} secondary={empty.secondary}>
            {empty.text}
          </EmptyBag>
        )
      ) : view === "grid" ? (
        <ul className={`mt-4 grid gap-3.5 px-5 lg:grid-cols-7 xl:grid-cols-8 ${gridColumnsClass(columns)}`}>
          {shown.map((item) => (
            <li key={item.id}>
              <SlotCell entry={toEntry(item)} owner={item.ownerNickname ? { nickname: item.ownerNickname, avatarUrl: item.ownerAvatarUrl ?? null } : undefined} />
            </li>
          ))}
          {showAdd && (
            <li ref={addSlotRef}>
              <AddSlotCell>
                <AddSlotButton size="cell" onClick={addItem.start} />
              </AddSlotCell>
            </li>
          )}
        </ul>
      ) : (
        <ul className="mt-4 flex flex-col border-t border-border">
          {shown.map((item) => (
            <li key={item.id}>
              <SlotRow entry={toEntry(item)} caption={item.ownerNickname ? `${item.ownerNickname} · ${item.inventoryName}` : item.inventoryName} />
            </li>
          ))}
          {showAdd && (
            <li ref={addSlotRef}>
              <AddSlotButton size="row" onClick={addItem.start} />
            </li>
          )}
        </ul>
      )}

      {addable && !canAdd && shown.length > 0 && (
        // + 를 그냥 없애면 기능이 사라진 줄 안다 (인벤토리 격자와 같은 줄). 여기는 사진을 들고 있지 않아서 떠나도 된다
        <Link href="/my/plan" className="mx-auto mt-6 text-label text-ink-muted underline underline-offset-4">
          칸이 가득 찼어요 · 프리미엄으로 늘리기
        </Link>
      )}

      {/* 떠 있는 + — + 칸이 화면 밖일 때만. 폰은 하단 탭(61 + 홈 막대) 바로 위에 뜬다 */}
      {addable && (
        <div className="pointer-events-none sticky bottom-[calc(3.8125rem+max(0px,env(safe-area-inset-bottom)-0.625rem))] mt-auto h-0 lg:bottom-0">
          {showAdd && !addSlotVisible && (
            <button
              type="button"
              onClick={addItem.start}
              aria-label="아이템 넣기"
              className="pointer-events-auto absolute bottom-4 right-5.5 flex size-10.5 items-center justify-center rounded-full bg-ink text-white shadow-lg active:opacity-80"
            >
              <Icon name="plusBold" />
            </button>
          )}
        </div>
      )}
      {addable && addItem.fileInput}
    </div>
  );
}
