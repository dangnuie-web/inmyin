"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { deleteInventory, reorderInventories, restoreInventory } from "@/app/(flow)/my/inventories/[id]/actions";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import type { FormState } from "@/lib/auth/rules";
import { inventoryUpdatePath } from "@/lib/inventory/paths";
import type { InventorySummary } from "@/lib/inventory/queries";
import { AddInventoryRow } from "./AddInventoryRow";
import { InventoryRow, UndoInventoryRow } from "./InventoryRow";
import { SwipeRow, type SwipeSide } from "./SlotGestures";

// "되돌리기" 줄이 남아 있는 시간. globals.css 의 undo-countdown 길이와 맞춘다
const UNDO_MS = 5000;
// 되살아난 줄에 옅은 회색이 스치는 시간. globals.css 의 row-flash 보다 길어야 한다
const FLASH_MS = 1600;

// 화면에만 미리 반영해 둔 줄. 서버가 보낸 목록에는 없을 수 있어서, 끼워 넣을 자리와 함께 들고 있는다
type Placed = { inventory: InventorySummary; index: number };

type InventoryListProps = {
  inventories: InventorySummary[];
  // 플랜의 인벤토리 한도. 다 찼으면 + 줄을 그리지 않는다
  maxInventories: number;
};

// 손잡이를 끄는 중. from — 집은 줄의 자리, to — 지금 놓으면 갈 자리, dy — 손가락이 움직인 만큼, pitch — 줄 하나의 높이 + 사이
type Drag = { id: string; pointerId: number; startY: number; from: number; to: number; dy: number; pitch: number };

// M-03 인벤토리 관리의 목록. 있는 인벤토리와 그 다음의 + 줄 하나만 그린다.
// 줄을 오른쪽으로 밀면 수정, 왼쪽으로 밀면 삭제다 (M-04 의 리스트와 같은 동작). 인벤토리는 비어 있을 때만 지울 수 있다.
// 순서: 줄 끝 손잡이를 누른 채 위아래로 끌면 줄이 들리고 다른 줄이 비켜난다. 놓으면 화면부터 바꾸고 서버에 적는다 —
// 실패하면 되돌리고 알린다. 손잡이에서만 끌 수 있어서 줄 몸통의 가로 밀기와 안 섞인다. 키보드는 손잡이에서 ↑↓ (무늬 빈화면프로필설계 v01 6절)
export function InventoryList({ inventories: serverInventories, maxInventories }: InventoryListProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  // 밀어서 블록이 나와 있는 줄. 한 번에 한 줄만 연다
  const [swiped, setSwiped] = useState<{ id: string; side: SwipeSide } | null>(null);

  // 삭제와 되돌리기는 서버의 답을 기다리지 않고 누른 즉시 화면부터 바꾼다 (InventoryBoard 와 같은 방식).
  // 방금 지운 것 ("되돌리기" 줄로 보인다)
  const [ghost, setGhost] = useState<(Placed & { deleting: Promise<FormState> }) | null>(null);
  // 되돌리기를 누른 것 (원래 줄로 보인다)
  const [revived, setRevived] = useState<Placed | null>(null);
  // 방금 되살아난 줄. 옅은 회색이 스친다
  const [restoredId, setRestoredId] = useState<string | null>(null);

  // 화면에서 먼저 바꾼 순서 (서버에 적는 중이거나 적은 뒤). 서버가 새 순서로 다시 보내도 같은 순서라 그대로 둔다
  const [order, setOrder] = useState<string[] | null>(null);
  const inventories = order
    ? [...serverInventories].sort((a, b) => rank(order, a.id) - rank(order, b.id))
    : serverInventories;
  const listRef = useRef<HTMLUListElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  // 서버가 보낸 목록에 위의 것들을 입힌다. 서버가 이미 목록에서 뺐으면 (또는 아직 안 넣었으면) 원래 자리에 끼워 넣는다
  const rows = inventories.map((inventory) => ({ inventory, deleted: inventory.id === ghost?.inventory.id }));
  for (const [placed, deleted] of [[ghost, true], [revived, false]] as const) {
    if (!placed || rows.some((row) => row.inventory.id === placed.inventory.id)) continue;
    // 살아 있는 줄을 placed.index 개 지나친 곳
    let at = 0;
    for (let live = 0; at < rows.length && live < placed.index; at += 1) {
      if (!rows[at].deleted) live += 1;
    }
    rows.splice(at, 0, { inventory: placed.inventory, deleted });
  }
  const liveCount = rows.filter((row) => !row.deleted).length;

  // 그 인벤토리와, 지워진 것을 뺀 목록에서의 자리
  function placeOf(inventoryId: string): Placed | null {
    const index = rows.findIndex((row) => row.inventory.id === inventoryId);
    if (index < 0) return null;
    return { inventory: rows[index].inventory, index: rows.slice(0, index).filter((row) => !row.deleted).length };
  }

  // 확인 창 없이 바로 지운다. 지운 자리는 "되돌리기" 줄로 잠깐 남는다. 그사이 다른 것을 또 지우면 앞의 것은 그대로 확정된다
  function remove(inventory: InventorySummary) {
    setSwiped(null);
    // 안에 든 것까지 말없이 사라지면 안 된다. 서버도 한 번 더 막는다
    if (inventory.usedSlots > 0) return setNotice(`${inventory.name}에 든 것이 있어요. 먼저 비운 뒤에 삭제할 수 있어요.`);
    const placed = placeOf(inventory.id);
    if (!placed) return;

    const deleting = deleteInventory(inventory.id);
    setGhost({ ...placed, deleting });
    if (revived?.inventory.id === inventory.id) setRevived(null);

    deleting.then((result) => {
      if (!result.error) return;
      // 못 지웠다. 줄을 원래대로 돌려놓는다
      setGhost((current) => (current?.inventory.id === inventory.id ? null : current));
      setNotice(result.error);
    });
  }

  // "되돌리기" 줄은 잠깐만 남는다. 시간은 줄이 뜬 순간부터 한 번만 잰다
  const ghostId = ghost?.inventory.id ?? null;
  useEffect(() => {
    if (!ghostId) return;
    const timer = setTimeout(() => setGhost(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [ghostId]);

  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  function undo() {
    if (!ghost) return;
    const { deleting, ...placed } = ghost;
    setGhost(null);
    setRevived(placed);

    void (async () => {
      // 지우는 일이 아직 안 끝났으면 끝난 뒤에 되살린다. 순서가 바뀌면 되살린 것이 다시 지워진다.
      // 지우는 데 실패했다면 되살릴 것도 없다 (안내는 remove 가 띄운다)
      const deleted = await deleting;
      const result = deleted.error ? {} : await restoreInventory(placed.inventory.id);
      setRevived(null);
      if (result.error) return setNotice(result.error);

      setRestoredId(placed.inventory.id);
      flashTimer.current = setTimeout(() => setRestoredId(null), FLASH_MS);
    })();
  }

  // 새 순서를 화면에 먼저 놓고 서버에 적는다. 지워져 "되돌리기"로 남은 줄은 빼고 센다
  function commitOrder(next: string[]) {
    const previous = order;
    setOrder(next);
    reorderInventories(next).then((result) => {
      if (!result.error) return;
      setOrder(previous);
      setNotice(result.error);
    });
  }

  // 줄을 from 에서 to 로 옮긴 순서 (살아 있는 줄만)
  function movedIds(from: number, to: number) {
    const ids = rows.map((row) => row.inventory.id);
    const [picked] = ids.splice(from, 1);
    ids.splice(to, 0, picked);
    return ids.filter((id) => !rows.find((row) => row.inventory.id === id)?.deleted);
  }

  function onHandleDown(event: PointerEvent<HTMLButtonElement>, id: string, index: number) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // 줄 몸통의 밀기(SwipeRow)가 이 손가락을 가져가지 않게
    event.stopPropagation();
    event.preventDefault();
    setSwiped(null);
    const items = listRef.current?.querySelectorAll<HTMLElement>(":scope > li[data-row]");
    const first = items?.[0]?.getBoundingClientRect();
    const second = items?.[1]?.getBoundingClientRect();
    const pitch = first && second ? second.top - first.top : (first?.height ?? 85);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    setDrag({ id, pointerId: event.pointerId, startY: event.clientY, from: index, to: index, dy: 0, pitch });
  }

  function onHandleMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dy = event.clientY - drag.startY;
    const to = Math.max(0, Math.min(rows.length - 1, drag.from + Math.round(dy / drag.pitch)));
    setDrag({ ...drag, dy, to });
  }

  function onHandleUp(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    setDrag(null);
    if (drag.to !== drag.from) commitOrder(movedIds(drag.from, drag.to));
  }

  // 키보드 — 손잡이에 포커스를 두고 ↑↓ 로 한 칸씩
  function onHandleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const to = event.key === "ArrowUp" ? index - 1 : event.key === "ArrowDown" ? index + 1 : null;
    if (to === null) return;
    event.preventDefault();
    if (to < 0 || to >= rows.length) return;
    const id = rows[index].inventory.id;
    commitOrder(movedIds(index, to));
    // 줄이 옮겨 간 뒤에도 같은 손잡이에 포커스가 남게
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-handle="${id}"]`)?.focus());
  }

  // 끄는 동안 각 줄이 비켜날 거리. 집은 줄은 손가락을 따라간다
  function shiftOf(index: number) {
    if (!drag) return 0;
    if (index === drag.from) return drag.dy;
    if (drag.from < drag.to && index > drag.from && index <= drag.to) return -drag.pitch;
    if (drag.to < drag.from && index >= drag.to && index < drag.from) return drag.pitch;
    return 0;
  }

  return (
    <>
      {/* 전체 숫자와 줄 사이, 줄과 줄 사이 모두 16px */}
      <ul ref={listRef} className="mt-4 flex flex-col gap-4">
        {rows.map(({ inventory, deleted }, index) => {
          const lifted = drag?.id === inventory.id;
          return (
          <li
            key={inventory.id}
            data-row
            style={drag ? { transform: `translateY(${shiftOf(index)}px)` } : undefined}
            className={`relative ${inventory.id === restoredId ? "animate-row-flash" : ""} ${
              lifted ? "z-10 scale-[1.02] bg-white shadow-md" : drag ? "transition-transform duration-150" : ""
            }`}
          >
            {deleted ? (
              <UndoInventoryRow inventory={inventory} onUndo={undo} />
            ) : (
              <SwipeRow
                open={swiped?.id === inventory.id ? swiped.side : null}
                onOpenChange={(side) => setSwiped(side && { id: inventory.id, side })}
                onEdit={() => router.push(inventoryUpdatePath(inventory.id))}
                onDelete={() => remove(inventory)}
              >
                <InventoryRow
                  inventory={inventory}
                  handle={
                    <button
                      type="button"
                      data-handle={inventory.id}
                      aria-label={`${inventory.name} 순서 바꾸기. 위아래 화살표로 옮겨요`}
                      onPointerDown={(event) => onHandleDown(event, inventory.id, index)}
                      onPointerMove={onHandleMove}
                      onPointerUp={onHandleUp}
                      onPointerCancel={onHandleUp}
                      onKeyDown={(event) => onHandleKey(event, index)}
                      // 끄는 동안 브라우저가 화면을 스크롤하지 않게
                      className="flex size-11 shrink-0 touch-none items-center justify-center text-gray-mid active:text-ink-muted"
                    >
                      <Icon name="reorder" />
                    </button>
                  }
                />
              </SwipeRow>
            )}
          </li>
          );
        })}
        {liveCount < maxInventories && <AddInventoryRow />}
      </ul>
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}

// 순서 목록에서의 자리. 없는 것(방금 만든 것)은 맨 뒤
function rank(order: string[], id: string) {
  const index = order.indexOf(id);
  return index < 0 ? order.length : index;
}
