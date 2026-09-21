"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteItem, restoreItem } from "@/app/(flow)/items/[itemId]/actions";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { itemCameraPath, itemUpdatePath, type InventoryView } from "@/lib/inventory/paths";
import type { SlotEntry } from "@/lib/inventory/queries";
import { AddSlotCell, gridFor, SLOT_ROW_CLASS, SlotCell, SlotRow, SlotRowThumb, UndoSlotCell, UndoSlotRow } from "./Slot";
import { LongPressSlotCell, SwipeRow, type SwipeSide } from "./SlotGestures";

type MenuAnchor = "slot" | "floating" | null;

// 강조가 끝난 뒤 주소에서 added 를 지우기까지의 시간. globals.css 의 slot-highlight 길이와 맞춘다
const HIGHLIGHT_MS = 1600;
// 지운 자리에 "되돌리기" 칸이 남아 있는 시간. globals.css 의 undo-countdown 길이와 맞춘다
const UNDO_MS = 5000;

type InventoryBoardProps = {
  inventoryId: string;
  // 방금 등록한(또는 되살린) 아이템의 id. 그 칸으로 스크롤하고 잠깐 강조한다
  addedId: string | null;
  // 방금 지운 아이템의 id. entries 안에 deleted 로 표시되어 같이 온다 — 제자리에 "되돌리기" 칸으로 잠깐 남는다
  deletedId: string | null;
  // 보여줄 것. 카테고리를 골랐으면 걸러진 목록이 온다
  entries: SlotEntry[];
  // 걸러지기 전의 전체 개수. 16/25 와 꽉 찼는지는 이 숫자로 본다
  usedSlots: number;
  slotCount: number;
  view: InventoryView;
};

// M-04 의 격자 · 리스트와 + 버튼. + 칸은 항상 마지막 아이템의 다음 칸에 하나만 있다.
export function InventoryBoard({ inventoryId, addedId, deletedId, entries, usedSlots, slotCount, view }: InventoryBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [menu, setMenu] = useState<MenuAnchor>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  const isFull = usedSlots >= slotCount;

  // 주소의 물음표 뒤를 고친다. 보기 방식과 고른 카테고리는 그대로 둔다
  const replaceParams = useCallback(
    (change: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams);
      change(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // + 칸이 화면 밖으로 나가면 플로팅 + 를 띄운다
  const addSlotRef = useRef<HTMLDivElement>(null);
  const [addSlotVisible, setAddSlotVisible] = useState(true);
  useEffect(() => {
    const target = addSlotRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setAddSlotVisible(entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [view, isFull]);

  // 방금 등록한 칸으로 스크롤한다. 강조가 끝나면 주소에서 added 를 지워서 새로고침해도 다시 번쩍이지 않게 한다
  useEffect(() => {
    if (!addedId) return;
    document.getElementById(slotElementId(addedId))?.scrollIntoView({ block: "center", behavior: "smooth" });
    const timer = setTimeout(() => replaceParams((params) => params.delete("added")), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [addedId, replaceParams]);

  // 아이템 수정 · 삭제. 리스트는 밀어서, 그리드는 길게 눌러서 부른다 (M-14 의 ⋮ 메뉴와 같은 일)
  const [, startTransition] = useTransition();
  // 길게 눌러 메뉴가 떠 있는 칸 (그리드)
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  // 밀어서 블록이 나와 있는 줄 (리스트). 한 번에 한 줄만 연다
  const [swiped, setSwiped] = useState<{ id: string; side: SwipeSide } | null>(null);

  function editItem(itemId: string) {
    router.push(itemUpdatePath(itemId));
  }

  // 확인 창 없이 바로 지운다. 지운 자리는 "되돌리기" 칸으로 잠깐 남는다 — 실제로 지우는 것이 아니라 되살릴 수 있다.
  // 그사이 다른 것을 또 지우면 앞의 것은 그대로 확정된다
  function removeItem(itemId: string) {
    setSwiped(null);
    startTransition(async () => {
      const result = await deleteItem(itemId);
      if (result.error) return setNotice(result.error);
      replaceParams((params) => params.set("deleted", itemId));
    });
  }

  const clearDeleted = useCallback(() => replaceParams((params) => params.delete("deleted")), [replaceParams]);

  // "되돌리기" 칸은 잠깐만 남는다. 시간이 지나면 주소에서 지우고, 그러면 뒤의 칸들이 당겨 붙는다.
  // 상세(M-14)에서 지우고 넘어왔을 때는 그 칸이 화면 밖일 수 있어서 보이는 곳으로 데려온다
  useEffect(() => {
    if (!deletedId) return;
    document.getElementById(slotElementId(deletedId))?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const timer = setTimeout(clearDeleted, UNDO_MS);
    return () => clearTimeout(timer);
  }, [deletedId, clearDeleted]);

  function undoDelete() {
    if (!deletedId) return;
    startTransition(async () => {
      const result = await restoreItem(deletedId);
      if (result.error) {
        clearDeleted();
        return setNotice(result.error);
      }
      // 되살아난 칸으로 스크롤하고 잠깐 강조한다
      replaceParams((params) => {
        params.delete("deleted");
        params.set("added", deletedId);
      });
    });
  }

  const itemActions = (itemId: string) => [
    { label: "삭제하기", onSelect: () => removeItem(itemId) },
    { label: "수정하기", onSelect: () => editItem(itemId) },
  ];

  const menuItems = [
    {
      label: "새 아이템 등록",
      onSelect: () => {
        // 아이템 등록(촬영)은 모바일 전용이다 (CLAUDE.md 규칙 5)
        if (!window.matchMedia("(pointer: coarse)").matches) return setNotice("휴대폰에서 등록해 주세요.");
        // 촬영 화면(M-06)으로 간다. 갤러리에서 고르는 것도 거기서 한다
        router.push(itemCameraPath(inventoryId));
      },
    },
    { label: "인벤토리 가져오기", onSelect: () => setNotice("인벤토리 가져오기는 곧 만들어요.") },
  ];

  const addButton = (size: "cell" | "row") => (
    <button
      type="button"
      onClick={() => setMenu("slot")}
      aria-label="추가"
      className={size === "cell" ? "flex size-full items-center justify-center text-disabled" : `${SLOT_ROW_CLASS} text-left text-disabled`}
    >
      {size === "cell" ? (
        <Icon name="plus" scale={2} />
      ) : (
        <>
          <SlotRowThumb>
            <Icon name="plus" />
          </SlotRowThumb>
          <span className="text-body">+를 눌러 아이템을 추가해주세요.</span>
        </>
      )}
    </button>
  );

  return (
    <div className="flex flex-1 flex-col">
      {view === "grid" ? (
        <Grid
          entries={entries}
          slotCount={slotCount}
          isFull={isFull}
          addedId={addedId}
          actionsFor={actionsFor}
          onActionsFor={setActionsFor}
          itemActions={itemActions}
          onUndo={undoDelete}
        >
          {(isLastColumn) => (
            <div ref={addSlotRef} className="relative size-full">
              {addButton("cell")}
              {menu === "slot" && (
                <DarkMenu
                  items={menuItems}
                  onClose={() => setMenu(null)}
                  // 오른쪽 끝 칸에서는 메뉴가 화면 밖으로 나가지 않게 왼쪽으로 편다
                  className={isLastColumn ? "right-1/2 top-1/2" : "left-1/2 top-1/2"}
                />
              )}
            </div>
          )}
        </Grid>
      ) : (
        <ul className="mt-3 flex flex-col border-t border-border">
          {entries.map((entry) => (
            <li key={entry.id} id={slotElementId(entry.id)} className={entry.id === addedId ? HIGHLIGHT_CLASS : ""}>
              {entry.deleted ? (
                <UndoSlotRow entry={entry} onUndo={undoDelete} />
              ) : entry.kind === "item" ? (
                <SwipeRow
                  open={swiped?.id === entry.id ? swiped.side : null}
                  onOpenChange={(side) => setSwiped(side && { id: entry.id, side })}
                  onEdit={() => editItem(entry.id)}
                  onDelete={() => removeItem(entry.id)}
                >
                  <SlotRow entry={entry} />
                </SwipeRow>
              ) : (
                // 안에 담긴 인벤토리의 수정 · 삭제는 인벤토리 목록(M-03)에서 한다
                <SlotRow entry={entry} />
              )}
            </li>
          ))}
          {!isFull && (
            <li>
              <div ref={addSlotRef} className="relative">
                {addButton("row")}
                {menu === "slot" && <DarkMenu items={menuItems} onClose={() => setMenu(null)} className="left-20 top-7" />}
              </div>
            </li>
          )}
        </ul>
      )}

      {isFull && (
        // + 를 그냥 없애면 기능이 사라진 줄 안다
        <Link href="/my/plan" className="mx-auto mt-6 text-label text-ink-muted underline underline-offset-4">
          칸이 가득 찼어요 · 프리미엄으로 늘리기
        </Link>
      )}

      {/* 화면 아래에 붙어 있는 줄 — 가운데 사용량, 오른쪽 플로팅 + */}
      <div className="pointer-events-none sticky bottom-0 mt-auto flex h-19 items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <p className="pointer-events-auto rounded-full bg-white px-3 py-0.5 text-label font-bold">
          {usedSlots}/{slotCount}
        </p>
        {!isFull && !addSlotVisible && (
          <div className="pointer-events-auto absolute bottom-4 right-5.5">
            <button
              type="button"
              onClick={() => setMenu("floating")}
              aria-label="추가"
              className="flex size-10.5 items-center justify-center rounded-full bg-point text-white shadow-lg active:opacity-80"
            >
              <Icon name="plusBold" />
            </button>
            {menu === "floating" && <DarkMenu items={menuItems} onClose={() => setMenu(null)} className="bottom-full right-0 mb-2" />}
          </div>
        )}
      </div>

      <Toast message={notice} onDone={hideNotice} />
    </div>
  );
}

// 스크롤할 칸을 찾기 위한 이름표
function slotElementId(entryId: string) {
  return `slot-${entryId}`;
}

const HIGHLIGHT_CLASS = "rounded-sm animate-slot-highlight";

type GridProps = {
  entries: SlotEntry[];
  slotCount: number;
  isFull: boolean;
  addedId: string | null;
  // 길게 눌러 메뉴가 떠 있는 칸
  actionsFor: string | null;
  onActionsFor: (entryId: string | null) => void;
  itemActions: (itemId: string) => { label: string; onSelect: () => void }[];
  onUndo: () => void;
  // + 칸의 내용. 그 칸이 오른쪽 끝 열인지 알려준다
  children: (isLastColumn: boolean) => React.ReactNode;
};

// 채워진 칸과 그 다음의 + 칸만 그린다. 빈 칸은 그리지 않는다 — 남은 용량은 아래의 16/25 가 알려준다
function Grid({ entries, slotCount, isFull, addedId, actionsFor, onActionsFor, itemActions, onUndo, children }: GridProps) {
  const { columns, className } = gridFor(slotCount);

  return (
    <ul className={`mt-6 grid gap-3.5 px-6.5 ${className}`}>
      {entries.map((entry, index) => (
        <li key={entry.id} id={slotElementId(entry.id)} className={`relative ${entry.id === addedId ? HIGHLIGHT_CLASS : ""}`}>
          {entry.deleted ? (
            <UndoSlotCell entry={entry} onUndo={onUndo} />
          ) : entry.kind === "item" ? (
            // 칸이 작아서 밀지 않고 길게 누른다
            <LongPressSlotCell entry={entry} onLongPress={() => onActionsFor(entry.id)} />
          ) : (
            // 안에 담긴 인벤토리의 수정 · 삭제는 인벤토리 목록(M-03)에서 한다
            <SlotCell entry={entry} />
          )}
          {actionsFor === entry.id && (
            <DarkMenu
              items={itemActions(entry.id)}
              onClose={() => onActionsFor(null)}
              // 오른쪽 끝 칸에서는 메뉴가 화면 밖으로 나가지 않게 왼쪽으로 편다
              className={index % columns === columns - 1 ? "right-1/2 top-1/2" : "left-1/2 top-1/2"}
            />
          )}
        </li>
      ))}
      {!isFull && (
        <li>
          <AddSlotCell>{children(entries.length % columns === columns - 1)}</AddSlotCell>
        </li>
      )}
    </ul>
  );
}
