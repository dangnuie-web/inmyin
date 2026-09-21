"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { moveItem } from "@/app/(flow)/items/[itemId]/actions";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { Toast } from "@/components/ui/Toast";
import type { InventoryView } from "@/lib/inventory/paths";
import type { PackingInventory, SlotEntry } from "@/lib/inventory/queries";
import { withSubjectParticle } from "@/lib/korean";
import { InventoryStrip } from "./InventoryStrip";
import { gridFor, PackingSlotCell, PackingSlotRow } from "./Slot";
import { ViewToggle } from "./ViewToggle";

// 넘어온 칸이 "톡" 하고 나타나는 동안. globals.css 의 slot-pop · row-flash 보다 길어야 한다
const ARRIVAL_MS = 1600;

type Side = "top" | "bottom";
const OTHER: Record<Side, Side> = { top: "bottom", bottom: "top" };

type PackingBoardProps = {
  inventories: PackingInventory[];
  // 짐싸기 버튼을 누른 인벤토리. 위쪽에 열린다
  startId: string;
};

// M-05 · 짐싸기. 인벤토리 두 개를 위아래로 열어 놓고, 아이템을 누르면 반대쪽으로 넘어간다.
// 한 번에 하나씩, 되돌리기 버튼 없이 — 반대쪽에서 다시 누르면 돌아온다. 누르는 즉시 저장된다.
export function PackingBoard({ inventories, startId }: PackingBoardProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  // 어느 인벤토리에 무엇이 들었는지. 옮기면 서버의 답을 기다리지 않고 여기부터 바꾼다 —
  // 이 화면에서 일어나는 변화는 전부 여기서 시작하므로, 처음 받은 뒤로는 이것이 기준이다
  const [entriesById, setEntriesById] = useState(() => Object.fromEntries(inventories.map(({ id, entries }) => [id, entries])));
  const [openId, setOpenId] = useState<Record<Side, string | null>>({
    top: startId,
    bottom: inventories.find((inventory) => inventory.id !== startId)?.id ?? null,
  });
  // 방금 넘어온 칸. "톡" 하고 나타난다
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  const arrivalTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(arrivalTimer.current), []);

  // 넘어온 칸이 받는 쪽의 보이는 범위 밖일 수 있다 (칸이 많을 때). 바로 데려와서 나타나는 모습이 보이게 한다
  useEffect(() => {
    if (arrivedId) document.getElementById(`packing-${arrivedId}`)?.scrollIntoView({ block: "nearest" });
  }, [arrivedId]);

  function move(entry: SlotEntry, from: Side) {
    const fromId = openId[from];
    const to = inventories.find((inventory) => inventory.id === openId[OTHER[from]]);
    if (!fromId || !to) return;
    if (entriesById[to.id].length >= to.slotCount) return setNotice(`${withSubjectParticle(to.name)} 꽉 찼습니다. 이동이 불가합니다`);

    // 새로 들어오는 것은 항상 맨 뒤 (CLAUDE.md 규칙 3). 빠져나간 자리는 뒤의 것들이 당겨 붙는다
    const fromIndex = entriesById[fromId].findIndex((other) => other.id === entry.id);
    setEntriesById((current) => ({
      ...current,
      [fromId]: current[fromId].filter((other) => other.id !== entry.id),
      [to.id]: [...current[to.id], entry],
    }));
    setArrivedId(entry.id);
    clearTimeout(arrivalTimer.current);
    arrivalTimer.current = setTimeout(() => setArrivedId(null), ARRIVAL_MS);

    moveItem(entry.id, to.id).then((result) => {
      if (!result.error) return;
      // 못 옮겼다. 원래 있던 자리로 돌려놓는다
      setEntriesById((current) => ({
        ...current,
        [to.id]: current[to.id].filter((other) => other.id !== entry.id),
        [fromId]: [...current[fromId].slice(0, fromIndex), entry, ...current[fromId].slice(fromIndex)],
      }));
      setNotice(result.error);
    });
  }

  return (
    <>
      {(["top", "bottom"] as const).map((side) => (
        <PackingHalf
          key={side}
          inventories={inventories}
          inventory={inventories.find((inventory) => inventory.id === openId[side]) ?? null}
          entries={openId[side] ? entriesById[openId[side]] : []}
          otherId={openId[OTHER[side]]}
          arrivedId={arrivedId}
          onOpen={(inventoryId) => setOpenId((current) => ({ ...current, [side]: inventoryId }))}
          onPick={(entry) => move(entry, side)}
          // 위아래를 가르는 선
          className={side === "top" ? "border-b border-gray-3" : ""}
        />
      ))}
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}

type PackingHalfProps = {
  inventories: PackingInventory[];
  // 이쪽에 열린 인벤토리. 인벤토리가 하나뿐이면 아래쪽은 열 것이 없다
  inventory: PackingInventory | null;
  entries: SlotEntry[];
  // 반대쪽에 열린 인벤토리. 같은 것을 양쪽에 열 수는 없다
  otherId: string | null;
  arrivedId: string | null;
  onOpen: (inventoryId: string) => void;
  onPick: (entry: SlotEntry) => void;
  className: string;
};

// 화면의 절반. 위에서부터: 인벤토리 띠 → 토글 + 카테고리 칩 → 칸들(이 안에서만 스크롤) → 1/25
function PackingHalf({ inventories, inventory, entries, otherId, arrivedId, onOpen, onPick, className }: PackingHalfProps) {
  const [view, setView] = useState<InventoryView>("grid");
  // 고른 카테고리와, 그것을 고른 인벤토리. 띠에서 다른 인벤토리로 갈아타면 "전체"로 돌아간다 — 태그는 인벤토리마다 다르다
  const [picked, setPicked] = useState<{ inventoryId: string; category: string } | null>(null);
  const category = picked && picked.inventoryId === inventory?.id ? picked.category : null;
  // 태그가 없는 아이템은 전체에서만 보인다 (CLAUDE.md 규칙 4)
  const shown = category ? entries.filter((entry) => entry.category === category) : entries;

  if (!inventory) {
    return (
      <section className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center ${className}`}>
        <p className="break-keep text-label text-ink-muted">짐을 옮기려면 인벤토리가 하나 더 필요해요.</p>
        <Link href="/my/inventories" className="text-label font-bold underline underline-offset-4">
          인벤토리 만들러 가기
        </Link>
      </section>
    );
  }

  const slotProps = (entry: SlotEntry) => ({
    entry,
    onPick: () => onPick(entry),
    // 안에 담긴 인벤토리는 아직 짐싸기로 옮기지 않는다 ("인벤토리 안에 인벤토리 담기"를 만들 때 같이 연다)
    disabled: entry.kind === "inventory",
    dimmed: entry.kind === "inventory" && entry.id === otherId,
  });

  return (
    <section aria-label={inventory.name} className={`flex min-h-0 flex-1 flex-col ${className}`}>
      <div className="mt-2">
        <InventoryStrip inventories={inventories} currentId={inventory.id} dimmedId={otherId} onSelect={onOpen} />
      </div>

      <div className="mt-3 flex shrink-0 items-center gap-2.5 overflow-x-auto px-7 [scrollbar-width:none]">
        <ViewToggle current={view} onSelect={setView} />
        <CategoryTag label="전체" selected={!category} onClick={() => setPicked(null)} />
        {inventory.categories.map((tag) => (
          <CategoryTag key={tag} label={tag} selected={tag === category} onClick={() => setPicked({ inventoryId: inventory.id, category: tag })} />
        ))}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {view === "grid" ? (
          <ul className={`grid gap-3.5 px-6.5 pb-2 ${gridFor(inventory.slotCount).className}`}>
            {shown.map((entry) => (
              <li key={entry.id} id={`packing-${entry.id}`} className={entry.id === arrivedId ? "animate-slot-pop" : ""}>
                <PackingSlotCell {...slotProps(entry)} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="flex flex-col border-t border-border">
            {shown.map((entry) => (
              <li key={entry.id} id={`packing-${entry.id}`} className={entry.id === arrivedId ? "animate-row-flash" : ""}>
                <PackingSlotRow {...slotProps(entry)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="shrink-0 py-2 text-center text-label font-bold">
        {entries.length}/{inventory.slotCount}
      </p>
    </section>
  );
}
