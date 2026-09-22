import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { slotEntryPath } from "@/lib/inventory/paths";
import type { SlotEntry } from "@/lib/inventory/queries";

// 인벤토리 상세(M-04)의 한 칸. 피그마 `아이템 슬롯` 컴포넌트.
// 같은 내용을 그리드에서는 네모 칸(SlotCell)으로, 리스트에서는 한 줄(SlotRow)로 그린다.
// 누르면 아이템은 상세(M-14)로, 안에 담긴 인벤토리는 그 인벤토리로 간다.

// 격자의 한 줄에 놓는 칸 수. 3 이 좋은 사람도 4 가 좋은 사람도 있어서 설정(M-02)에서 고르고 계정(users.grid_columns)에 남는다.
// 5 는 써 보니 너무 작아서 뺐다. className 은 Tailwind가 찾을 수 있게 글자 그대로 적어둔다
const COLUMN_CLASS = { 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" } as const;
export const GRID_COLUMN_CHOICES = [3, 4] as const;
export type GridColumns = (typeof GRID_COLUMN_CHOICES)[number];
export const DEFAULT_GRID_COLUMNS: GridColumns = 4;

// DB 에서 온 숫자를 선택지 중 하나로. 아니면 기본값
export function toGridColumns(value: number): GridColumns {
  return (GRID_COLUMN_CHOICES as readonly number[]).includes(value) ? (value as GridColumns) : DEFAULT_GRID_COLUMNS;
}

// 칸이 많은 플랜(docs/screens.md "칸 수에 따른 격자")은 고른 값과 상관없이 촘촘하게 그린다
export function gridFor(slotCount: number, preferred: GridColumns = DEFAULT_GRID_COLUMNS) {
  const columns = slotCount >= 100 ? 5 : slotCount >= 50 ? 4 : preferred;
  return { columns, className: COLUMN_CLASS[columns] };
}

// 인벤토리 한 판이 아닌 격자(아이템 모아보기 M-13)는 고른 칸 수 그대로
export function gridColumnsClass(columns: GridColumns) {
  return COLUMN_CLASS[columns];
}

// 개수 배지 "× n". 하나뿐이면 그리지 않는다
function QuantityBadge({ quantity, className }: { quantity: number; className: string }) {
  if (quantity <= 1) return null;
  return <span className={`rounded-full px-2 text-caption ${className}`}>× {quantity}</span>;
}

function SlotImage({ entry, sizes }: { entry: SlotEntry; sizes: string }) {
  if (!entry.imageUrl) return null;
  // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
  return <Image src={entry.imageUrl} alt={entry.name} fill sizes={sizes} unoptimized draggable={false} className="object-cover" />;
}

const CELL_CLASS = "relative flex aspect-square items-center justify-center rounded-sm";
// 길게 누르거나 밀 때 브라우저가 끼어들지 않게 한다 — 아이폰의 링크 미리보기, 글자 선택, 링크 끌어가기
const NO_BROWSER_GESTURES = "select-none [-webkit-touch-callout:none]";

// 그리드의 + 칸. 메뉴가 칸 밖으로 펼쳐져야 해서 넘치는 부분을 자르지 않는다.
// (빈 칸은 그리지 않는다 — 채워진 칸과 그 다음의 + 칸만 보인다)
export function AddSlotCell({ children }: { children: ReactNode }) {
  // + 칸은 바탕이 희다 — 채워진 칸과 구분된다
  return <div className={`${CELL_CLASS} bg-white`}>{children}</div>;
}

type SlotCellProps = Omit<ComponentProps<typeof Link>, "href" | "className"> & {
  entry: SlotEntry;
  // 지금 보고 있는 아이템의 칸 (M-14 아래의 격자). 테두리를 두른다
  current?: boolean;
};

// 나머지 props 는 링크에 그대로 넘긴다 — 길게 누르기(SlotGestures)가 여기에 손잡이를 단다
export function SlotCell({ entry, current = false, ...props }: SlotCellProps) {
  return (
    // 옅은 회색 바탕. 배경을 지운 사진은 이 위에 물건만 놓인다
    <Link
      {...props}
      href={slotEntryPath(entry)}
      aria-label={entry.name}
      aria-current={current ? "true" : undefined}
      draggable={false}
      className={`${CELL_CLASS} ${NO_BROWSER_GESTURES} overflow-hidden bg-gray-1 active:opacity-80 ${current ? "ring-2 ring-ink" : ""}`}
    >
      <SlotImage entry={entry} sizes="(min-width: 448px) 130px, 30vw" />
      <QuantityBadge quantity={entry.quantity} className="absolute bottom-2 right-2 bg-white" />
    </Link>
  );
}

export const SLOT_ROW_CLASS = "flex h-25 w-full items-center gap-8 border-b border-border px-5";

// 리스트 줄 왼쪽의 네모 칸
export function SlotRowThumb({ filled = false, children }: { filled?: boolean; children?: ReactNode }) {
  return (
    <div
      className={`relative flex size-13.5 shrink-0 items-center justify-center overflow-hidden rounded-sm ${
        filled ? "bg-gray-1" : "bg-white"
      }`}
    >
      {children}
    </div>
  );
}

// 나머지 props 는 링크에 그대로 넘긴다 — 길게 누르기(SlotGestures)가 여기에 손잡이를 단다
type SlotRowProps = Omit<ComponentProps<typeof Link>, "href" | "className"> & {
  entry: SlotEntry;
  // 이름 아래에 덧붙이는 한 줄. 아이템 모아보기(M-13)에서 "어느 인벤토리에 있는지"를 적는다
  caption?: string;
};

export function SlotRow({ entry, caption, ...props }: SlotRowProps) {
  return (
    <Link {...props} href={slotEntryPath(entry)} draggable={false} className={`${SLOT_ROW_CLASS} ${NO_BROWSER_GESTURES} active:opacity-80`}>
      <SlotRowThumb filled>
        <SlotImage entry={entry} sizes="54px" />
      </SlotRowThumb>
      <p className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body">{entry.name}</span>
        {caption && <span className="truncate text-caption text-ink-muted">{caption}</span>}
      </p>
      <QuantityBadge quantity={entry.quantity} className="bg-gray-1" />
    </Link>
  );
}

// 방금 지운 아이템의 자리. 5초 동안 "되돌리기" 칸으로 남았다가 사라진다 — 그때 뒤의 칸들이 당겨 붙는다.
// 지운 바로 그 자리에 뜨기 때문에 눈도 손가락도 이미 여기에 있다. 보라색 선이 남은 시간을 알려준다 —
// 리스트의 줄에서는 아래의 선이 줄어들고, 그리드의 칸에서는 테두리를 따라 한 바퀴 돌며 지워진다
const UNDO_COUNTDOWN_CLASS = "absolute inset-x-0 bottom-0 h-0.75 origin-left animate-undo-countdown bg-point";
const UNDO_IMAGE_CLASS = "opacity-25 grayscale";

export function UndoSlotCell({ entry, onUndo }: { entry: SlotEntry; onUndo: () => void }) {
  return (
    <button
      type="button"
      onClick={onUndo}
      aria-label={`${entry.name} 삭제 되돌리기`}
      className={`${CELL_CLASS} w-full flex-col gap-1.5 overflow-hidden bg-gray-1 text-point active:opacity-80`}
    >
      <span className={`absolute inset-0 ${UNDO_IMAGE_CLASS}`}>
        <SlotImage entry={entry} sizes="(min-width: 448px) 130px, 30vw" />
      </span>
      <Icon name="undo" scale={0.6} className="relative" />
      <span className="relative text-caption font-bold">되돌리기</span>
      {/* 칸의 둥근 모서리(8px)를 따라가는 테두리. 위 가운데에서 시작해 시계 방향으로 지워진다 —
          선을 시계 반대 방향으로 그려 두고 끝에서부터 지우면 그렇게 보인다 (사파리는 음수 dashoffset 을 잘 못 다룬다) */}
      <svg viewBox="0 0 100 100" fill="none" aria-hidden className="pointer-events-none absolute inset-0 size-full">
        <path
          d="M50 1.5H7.5A6 6 0 0 0 1.5 7.5V92.5A6 6 0 0 0 7.5 98.5H92.5A6 6 0 0 0 98.5 92.5V7.5A6 6 0 0 0 92.5 1.5H50"
          pathLength={1}
          stroke="currentColor"
          strokeWidth={3}
          strokeDasharray={1}
          className="animate-undo-around"
        />
      </svg>
    </button>
  );
}

export function UndoSlotRow({ entry, onUndo }: { entry: SlotEntry; onUndo: () => void }) {
  return (
    <button type="button" onClick={onUndo} className={`${SLOT_ROW_CLASS} relative text-left active:opacity-80`}>
      <span className={UNDO_IMAGE_CLASS}>
        <SlotRowThumb filled>
          <SlotImage entry={entry} sizes="54px" />
        </SlotRowThumb>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body text-disabled">{entry.name}</span>
        <span className="text-caption text-ink-muted">삭제했어요</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-label font-bold text-point">
        <Icon name="undo" scale={0.45} />
        되돌리기
      </span>
      <span className={UNDO_COUNTDOWN_CLASS} />
    </button>
  );
}

// 짐싸기(M-05)의 칸. 누르면 상세로 가지 않고 반대쪽 인벤토리로 넘어간다.
// dimmed — 반대쪽에 열려 있는 인벤토리가 이 안에 담겨 있을 때. 어둡게 보인다
type PackingSlotProps = { entry: SlotEntry; onPick: () => void; disabled?: boolean; dimmed?: boolean };

const DIMMED_CLASS = "absolute inset-0 bg-ink/60";

export function PackingSlotCell({ entry, onPick, disabled = false, dimmed = false }: PackingSlotProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-label={`${entry.name} 옮기기`}
      className={`${CELL_CLASS} w-full overflow-hidden bg-gray-1 active:opacity-80`}
    >
      <SlotImage entry={entry} sizes="(min-width: 448px) 130px, 30vw" />
      <QuantityBadge quantity={entry.quantity} className="absolute bottom-2 right-2 bg-white" />
      {dimmed && <span className={DIMMED_CLASS} />}
    </button>
  );
}
