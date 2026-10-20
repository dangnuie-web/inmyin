import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import type { InventorySummary } from "@/lib/inventory/queries";
import { InventoryThumb } from "./InventoryRow";
import { StripScroll } from "./StripScroll";

// 주소로 갈아타는 곳(프로필 격자)은 hrefFor 를, 화면 안에서 갈아타는 곳(M-05 짐싸기)은 onSelect 를 준다
type InventoryStripProps = {
  inventories: (Pick<InventorySummary, "id" | "name" | "imageUrl"> & { isPublic?: boolean })[];
  currentId: string | null;
  // 짐싸기에서 반대쪽에 열려 있는 인벤토리. 어둡게 보이고 고를 수 없다 — 같은 것을 양쪽에 열 수는 없다
  dimmedId?: string | null;
  // 칸 아래 이름(11px)과 비공개 자물쇠 배지 — 프로필 격자의 띠 (무늬 빈화면프로필설계 v01 3-1). 짐싸기는 이름 없이
  named?: boolean;
  // 띠 맨 끝에 붙는 것 — 내 프로필의 + 칸 "만들기"(AddInventoryTile)
  trailing?: ReactNode;
  // 화면 읽기 프로그램용 이름. 내 것 "내 인벤토리", 남의 것 "닉네임의 인벤토리"
  label?: string;
} & ({ hrefFor: (inventoryId: string) => string; onSelect?: undefined } | { onSelect: (inventoryId: string) => void; hrefFor?: undefined });

// 프로필 격자 · M-05 위쪽의 인벤토리 띠. 인벤토리를 순서(sort_order)대로 가로로 늘어놓고, 누르면 그 인벤토리로 갈아탄다.
export function InventoryStrip({ inventories, currentId, dimmedId, named = false, trailing, label = "내 인벤토리", hrefFor, onSelect }: InventoryStripProps) {
  return (
    <nav aria-label={label}>
      {/* 이름이 붙으면 칸 사이 16 (이름 없이 썸네일만이면 20) */}
      <StripScroll className={`flex overflow-x-auto px-5 [scrollbar-width:none] ${named ? "gap-4" : "gap-5"}`}>
        {inventories.map((inventory) => {
          const isCurrent = inventory.id === currentId;
          const isDimmed = inventory.id === dimmedId;
          const isPrivate = named && inventory.isPublic === false;
          const name = isPrivate ? `${inventory.name} (비공개)` : inventory.name;
          // 고른 것만 테두리가 보인다. 나머지도 같은 두께의 투명 테두리를 둬서 줄이 흔들리지 않게 한다
          const frame = `relative block rounded-md border p-1 ${isCurrent ? "border-ink" : "border-transparent"}`;
          const thumb = (
            <span className={frame}>
              <InventoryThumb filled>
                {inventory.imageUrl && <Image src={inventory.imageUrl} alt="" fill sizes="52px" unoptimized className="object-cover" />}
                {isDimmed && <span className="absolute inset-0 bg-ink/60" />}
              </InventoryThumb>
              {isPrivate && (
                <span className="absolute right-0 bottom-0 flex size-4.5 items-center justify-center rounded-full border border-border bg-white text-ink">
                  <Icon name="lock" scale={0.5} />
                </span>
              )}
            </span>
          );
          const body = (
            <>
              {thumb}
              {named && (
                <span className={`mt-1 block truncate text-center text-[11px] leading-[1.2] ${isCurrent ? "font-bold text-ink" : "font-medium text-ink-muted"}`}>
                  {inventory.name}
                </span>
              )}
            </>
          );
          const className = named ? "block w-15" : "block";
          return (
            <li key={inventory.id} className="shrink-0">
              {hrefFor ? (
                <Link href={hrefFor(inventory.id)} aria-label={name} aria-current={isCurrent ? "page" : undefined} className={className}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(inventory.id)}
                  disabled={isDimmed}
                  aria-label={name}
                  aria-pressed={isCurrent}
                  className={className}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
        {trailing}
      </StripScroll>
    </nav>
  );
}
