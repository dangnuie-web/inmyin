"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import type { InventoryView } from "@/lib/inventory/paths";
import type { SlotEntry } from "@/lib/inventory/queries";
import { EmptySlotCell, SLOT_ROW_CLASS, SlotCell, SlotRow, SlotRowThumb } from "./Slot";

// 빈 칸은 화면을 채울 만큼만 그린다 — 아이템이 적어도 이만큼은 보여서 인벤토리처럼 보인다.
// 남은 용량은 아래의 16/25 가 알려준다
const MIN_ROWS = 5;

// docs/screens.md "칸 수에 따른 격자". className 은 Tailwind가 찾을 수 있게 글자 그대로 적어둔다
function gridFor(slotCount: number) {
  if (slotCount >= 100) return { columns: 5, className: "grid-cols-5" };
  if (slotCount >= 50) return { columns: 4, className: "grid-cols-4" };
  return { columns: 3, className: "grid-cols-3" };
}

type MenuAnchor = "slot" | "floating" | null;

type InventoryBoardProps = {
  // 보여줄 것. 카테고리를 골랐으면 걸러진 목록이 온다
  entries: SlotEntry[];
  // 걸러지기 전의 전체 개수. 16/25 와 꽉 찼는지는 이 숫자로 본다
  usedSlots: number;
  slotCount: number;
  view: InventoryView;
};

// M-04 의 격자 · 리스트와 + 버튼. + 칸은 항상 마지막 아이템의 다음 칸에 하나만 있다.
export function InventoryBoard({ entries, usedSlots, slotCount, view }: InventoryBoardProps) {
  const [menu, setMenu] = useState<MenuAnchor>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  const isFull = usedSlots >= slotCount;

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

  const menuItems = [
    {
      label: "새 아이템 등록",
      onSelect: () =>
        setNotice(
          // 아이템 등록(촬영)은 모바일 전용이다 (CLAUDE.md 규칙 5)
          window.matchMedia("(pointer: coarse)").matches
            ? "아이템 등록은 곧 만들어요."
            : "휴대폰에서 등록해 주세요.",
        ),
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
        <Grid entries={entries} slotCount={slotCount} isFull={isFull}>
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
            <li key={entry.id}>
              <SlotRow entry={entry} />
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
              className="flex size-11.5 items-center justify-center rounded-full bg-point text-white shadow-lg active:opacity-80"
            >
              <Icon name="plus" />
            </button>
            {menu === "floating" && <DarkMenu items={menuItems} onClose={() => setMenu(null)} className="bottom-full right-0 mb-2" />}
          </div>
        )}
      </div>

      <Toast message={notice} onDone={hideNotice} />
    </div>
  );
}

type GridProps = {
  entries: SlotEntry[];
  slotCount: number;
  isFull: boolean;
  // + 칸의 내용. 그 칸이 오른쪽 끝 열인지 알려준다
  children: (isLastColumn: boolean) => React.ReactNode;
};

function Grid({ entries, slotCount, isFull, children }: GridProps) {
  const { columns, className } = gridFor(slotCount);
  const addIndex = isFull ? -1 : entries.length;

  // + 칸이 있는 줄 + 빈 줄 하나까지. 적어도 MIN_ROWS 줄, 많아도 인벤토리 크기까지
  const rows = Math.max(MIN_ROWS, Math.ceil((entries.length + 1) / columns) + 1);
  const cellCount = Math.min(slotCount, rows * columns);

  return (
    <ul className={`mt-6 grid gap-3.5 px-6.5 ${className}`}>
      {Array.from({ length: cellCount }, (_, index) => (
        <li key={entries[index]?.id ?? index}>
          {index < entries.length ? (
            <SlotCell entry={entries[index]} />
          ) : index === addIndex ? (
            <EmptySlotCell>{children(index % columns === columns - 1)}</EmptySlotCell>
          ) : (
            <EmptySlotCell />
          )}
        </li>
      ))}
    </ul>
  );
}
