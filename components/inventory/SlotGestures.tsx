"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import type { SlotEntry } from "@/lib/inventory/queries";
import { SlotCell } from "./Slot";

// 칸의 수정 · 삭제 동작. 리스트의 줄은 밀고(SwipeRow), 그리드의 작은 칸은 길게 누른다(LongPressSlotCell).
// 손가락 · 마우스 · 펜을 한 가지로 다루는 포인터 이벤트로 만들었다 — 데스크톱에서도 똑같이 된다.

const LONG_PRESS_MS = 500;
// 누른 채 이만큼(px) 움직이면 길게 누르기가 아니라 스크롤이다
const PRESS_MOVE_LIMIT = 10;

// 길게 누르면 onLongPress. 마우스 오른쪽 버튼도 같은 일을 한다
function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  // 길게 누르기가 일어났는지. 손을 뗄 때 따라오는 클릭(= 상세로 이동)을 막는 데 쓴다
  const fired = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  function cancel() {
    clearTimeout(timer.current);
    start.current = null;
  }

  function fire() {
    cancel();
    fired.current = true;
    onLongPress();
  }

  return {
    onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      fired.current = false;
      start.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(fire, LONG_PRESS_MS);
    },
    onPointerMove(event: PointerEvent) {
      if (!start.current) return;
      if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > PRESS_MOVE_LIMIT) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    // 안드로이드는 길게 누르면, 데스크톱은 오른쪽 버튼을 누르면 브라우저 메뉴를 띄운다. 그 대신 우리 메뉴를 띄운다
    onContextMenu(event: MouseEvent) {
      event.preventDefault();
      if (!fired.current) fire();
    },
    onClickCapture(event: MouseEvent) {
      if (!fired.current) return;
      fired.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}

export function LongPressSlotCell({ entry, onLongPress }: { entry: SlotEntry; onLongPress: () => void }) {
  return <SlotCell entry={entry} {...useLongPress(onLongPress)} />;
}

// 피그마: 줄 높이 100 에 너비 77 인 색 블록이 가장자리에서 줄을 덮으며 나온다. 줄의 내용은 움직이지 않는다
const PANEL_WIDTH = 77;
// 손을 뗐을 때 블록이 이만큼(px) 넘게 나와 있으면 끝까지 열고, 아니면 닫는다
const OPEN_LIMIT = PANEL_WIDTH / 2;
// 이만큼 움직이고 나서야 가로로 미는 것인지 세로로 스크롤하는 것인지 정한다
const AXIS_LIMIT = 6;

export type SwipeSide = "edit" | "delete";

type SwipeRowProps = {
  // 어느 쪽이 열려 있는지. 한 번에 한 줄만 열리게 부모가 들고 있는다
  open: SwipeSide | null;
  onOpenChange: (side: SwipeSide | null) => void;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
};

// 오른쪽으로 밀면 왼쪽에서 회색 연필(수정), 왼쪽으로 밀면 오른쪽에서 보라색 휴지통(삭제)이 나온다
export function SwipeRow({ open, onOpenChange, onEdit, onDelete, children }: SwipeRowProps) {
  // 미는 동안의 위치. + 는 연필이 나온 만큼, − 는 휴지통이 나온 만큼 (px). 밀고 있지 않으면 null
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  // 같은 값을 하나 더 들고 있는다. 빠르게 휙 밀면 화면이 다시 그려지기 전에 손이 떨어져서,
  // 손을 뗀 순간에는 위의 값이 아직 옛것일 수 있다
  const latestOffset = useRef<number | null>(null);
  const start = useRef<{ x: number; y: number; base: number; horizontal: boolean } | null>(null);
  // 방금 밀었는지. 손을 뗄 때 따라오는 클릭(= 상세로 이동)을 막는 데 쓴다
  const swiped = useRef(false);

  const restOffset = open === "edit" ? PANEL_WIDTH : open === "delete" ? -PANEL_WIDTH : 0;
  const offset = dragOffset ?? restOffset;

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    swiped.current = false;
    start.current = { x: event.clientX, y: event.clientY, base: restOffset, horizontal: false };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const from = start.current;
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;

    if (!from.horizontal) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < AXIS_LIMIT) return;
      // 세로로 움직였으면 스크롤이다. 손을 뗀다
      if (Math.abs(dy) > Math.abs(dx)) return void (start.current = null);
      from.horizontal = true;
      swiped.current = true;
      // 손가락이 줄 밖으로 나가도 계속 따라오게 한다. 그사이 손가락이 떨어졌으면 실패하는데, 그래도 밀기는 이어 간다
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {}
    }
    latestOffset.current = Math.max(-PANEL_WIDTH, Math.min(PANEL_WIDTH, from.base + dx));
    setDragOffset(latestOffset.current);
  }

  function onPointerEnd() {
    start.current = null;
    const released = latestOffset.current;
    if (released === null) return;
    latestOffset.current = null;
    onOpenChange(released > OPEN_LIMIT ? "edit" : released < -OPEN_LIMIT ? "delete" : null);
    setDragOffset(null);
  }

  function onClickCapture(event: MouseEvent) {
    const onPanel = (event.target as HTMLElement).closest("[data-swipe-panel]");
    // 민 직후의 클릭, 그리고 블록이 열린 채 줄을 누른 것은 상세로 가지 않고 닫기만 한다
    if (swiped.current || (open && !onPanel)) {
      event.preventDefault();
      event.stopPropagation();
      if (!swiped.current) onOpenChange(null);
    }
    swiped.current = false;
  }

  const panelClass = `absolute inset-y-0 flex w-19.25 items-center justify-center text-white ${
    dragOffset === null ? "transition-transform duration-200" : ""
  }`;

  return (
    <div
      // pan-y — 세로 스크롤은 브라우저가, 가로로 미는 것은 우리가 받는다
      className="relative touch-pan-y select-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={onClickCapture}
    >
      {children}
      <button
        type="button"
        data-swipe-panel
        onClick={onEdit}
        aria-label="수정"
        tabIndex={open === "edit" ? 0 : -1}
        className={`${panelClass} left-0 bg-gray-4`}
        style={{ transform: `translateX(${Math.min(0, offset - PANEL_WIDTH)}px)` }}
      >
        <Icon name="edit" />
      </button>
      <button
        type="button"
        data-swipe-panel
        onClick={onDelete}
        aria-label="삭제"
        tabIndex={open === "delete" ? 0 : -1}
        className={`${panelClass} right-0 bg-point`}
        style={{ transform: `translateX(${Math.max(0, offset + PANEL_WIDTH)}px)` }}
      >
        <Icon name="trash" />
      </button>
    </div>
  );
}
