import Image from "next/image";
import Link from "next/link";
import type { InventorySummary } from "@/lib/inventory/queries";
import { InventoryThumb } from "./InventoryRow";

// 주소로 갈아타는 곳(M-04)은 hrefFor 를, 화면 안에서 갈아타는 곳(M-05 짐싸기)은 onSelect 를 준다
type InventoryStripProps = {
  inventories: Pick<InventorySummary, "id" | "name" | "imageUrl">[];
  currentId: string | null;
  // 짐싸기에서 반대쪽에 열려 있는 인벤토리. 어둡게 보이고 고를 수 없다 — 같은 것을 양쪽에 열 수는 없다
  dimmedId?: string | null;
} & ({ hrefFor: (inventoryId: string) => string; onSelect?: undefined } | { onSelect: (inventoryId: string) => void; hrefFor?: undefined });

// M-04 · M-05 위쪽의 인벤토리 띠. 내 인벤토리를 가로로 늘어놓고, 누르면 그 인벤토리로 갈아탄다.
export function InventoryStrip({ inventories, currentId, dimmedId, hrefFor, onSelect }: InventoryStripProps) {
  return (
    <nav aria-label="내 인벤토리">
      <ul className="flex gap-5 overflow-x-auto px-5 [scrollbar-width:none]">
        {inventories.map((inventory) => {
          const isCurrent = inventory.id === currentId;
          const isDimmed = inventory.id === dimmedId;
          // 고른 것만 테두리가 보인다. 나머지도 같은 두께의 투명 테두리를 둬서 줄이 흔들리지 않게 한다
          const className = `block rounded-md border p-1 ${isCurrent ? "border-ink" : "border-transparent"}`;
          const thumb = (
            <InventoryThumb filled>
              {inventory.imageUrl && <Image src={inventory.imageUrl} alt="" fill sizes="52px" unoptimized className="object-cover" />}
              {isDimmed && <span className="absolute inset-0 bg-ink/60" />}
            </InventoryThumb>
          );
          return (
            <li key={inventory.id} className="shrink-0">
              {hrefFor ? (
                <Link href={hrefFor(inventory.id)} aria-label={inventory.name} aria-current={isCurrent ? "page" : undefined} className={className}>
                  {thumb}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(inventory.id)}
                  disabled={isDimmed}
                  aria-label={inventory.name}
                  aria-pressed={isCurrent}
                  className={className}
                >
                  {thumb}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
