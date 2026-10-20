import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { inventoryUpdatePath } from "@/lib/inventory/paths";
import type { InventorySummary } from "@/lib/inventory/queries";

// 인벤토리 관리(M-03)의 한 줄. 피그마 컴포넌트의 변형 중 `인벤토리 있음` 이 여기 있고,
// `추가`(+)는 AddInventoryRow 에 있다. `빈칸` 은 그리지 않기로 했다.

// 줄 왼쪽의 네모 칸. 사진이 든 칸은 filled
export function InventoryThumb({ filled = false, children }: { filled?: boolean; children?: ReactNode }) {
  return (
    <div
      className={`relative flex size-13 shrink-0 items-center justify-center overflow-hidden rounded-sm ${
        filled ? "bg-gray-2" : "bg-gray-1"
      }`}
    >
      {children}
    </div>
  );
}

// 줄의 공통 틀 — 높이와 좌우 여백
// 좌우 여백 20px — 피그마는 25/44 였는데 써 보니 오른쪽이 넓어 보여서 양쪽을 같게 했다. 헤더의 뒤로 화살표도 이 선에 맞춘다 (M-03)
export const INVENTORY_ROW_CLASS = "flex h-21.25 w-full items-center gap-7 px-5";

export function InventoryPhoto({ inventory }: { inventory: Pick<InventorySummary, "imageUrl"> }) {
  return (
    <InventoryThumb filled>
      {inventory.imageUrl && (
        // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
        <Image src={inventory.imageUrl} alt="" fill sizes="52px" unoptimized draggable={false} className="object-cover" />
      )}
    </InventoryThumb>
  );
}

// 인벤토리 관리(M-03)의 한 줄 — 사진 · 이름(비공개면 자물쇠) · n/25 · 오른쪽 끝 순서 손잡이.
// 누르면 수정 화면(이름 · 태그 · 공개)으로 간다 — 이 화면은 "관리"라서 (무늬 빈화면프로필설계 v01 6절. 전에는 상세로 갔다).
// 밀어서 수정 · 삭제하는 줄이라, 브라우저가 끼어들지 않게 한다 — 아이폰의 링크 미리보기, 글자 선택, 링크 끌어가기.
// handle — 줄 끝의 손잡이(InventoryList 가 준다). 링크 밖에 둬서 누르는 것과 끄는 것이 섞이지 않는다
export function InventoryRow({ inventory, handle }: { inventory: InventorySummary; handle?: ReactNode }) {
  return (
    <div className={`flex h-21.25 w-full items-center ${handle ? "pr-2.5" : "pr-5"}`}>
      <Link
        href={inventoryUpdatePath(inventory.id)}
        draggable={false}
        className="flex min-w-0 flex-1 items-center gap-7 self-stretch pl-5 select-none [-webkit-touch-callout:none] active:opacity-60"
      >
        <InventoryPhoto inventory={inventory} />
        <p className="flex min-w-0 flex-1 items-center gap-2 text-title font-bold">
          <span className="truncate">{inventory.name}</span>
          {!inventory.isPublic && (
            <span role="img" aria-label="비공개" className="shrink-0 text-ink-muted">
              <Icon name="lock" scale={2 / 3} />
            </span>
          )}
        </p>
        <p className="num text-caption">
          {inventory.usedSlots}/{inventory.slotCount}
        </p>
      </Link>
      {handle}
    </div>
  );
}

// 방금 지운 인벤토리의 자리. 아이템과 똑같이 5초 동안 "되돌리기" 줄로 남았다가 사라진다 (components/inventory/Slot.tsx)
export function UndoInventoryRow({ inventory, onUndo }: { inventory: InventorySummary; onUndo: () => void }) {
  return (
    <button type="button" onClick={onUndo} className={`${INVENTORY_ROW_CLASS} relative text-left active:opacity-80`}>
      <span className="opacity-25 grayscale">
        <InventoryPhoto inventory={inventory} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-title font-bold text-disabled">{inventory.name}</span>
        <span className="text-caption text-ink-muted">삭제했어요</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-label font-bold text-ink">
        <Icon name="undo" scale={0.45} />
        되돌리기
      </span>
      <span className="absolute inset-x-0 bottom-0 h-0.75 origin-left animate-undo-countdown bg-ink" />
    </button>
  );
}
