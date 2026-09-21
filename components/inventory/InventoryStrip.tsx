import Image from "next/image";
import Link from "next/link";
import { inventoryPath, type InventoryView } from "@/lib/inventory/paths";
import type { InventorySummary } from "@/lib/inventory/queries";
import { InventoryThumb } from "./InventoryRow";

type InventoryStripProps = {
  inventories: InventorySummary[];
  currentId: string;
  view: InventoryView;
};

// M-04 위쪽의 인벤토리 띠. 내 인벤토리를 가로로 늘어놓고, 누르면 그 인벤토리로 갈아탄다.
export function InventoryStrip({ inventories, currentId, view }: InventoryStripProps) {
  return (
    <nav aria-label="내 인벤토리">
      <ul className="flex gap-5 overflow-x-auto px-5 [scrollbar-width:none]">
        {inventories.map((inventory) => {
          const isCurrent = inventory.id === currentId;
          return (
            <li key={inventory.id} className="shrink-0">
              <Link
                href={inventoryPath(inventory.id, { view })}
                aria-label={inventory.name}
                aria-current={isCurrent ? "page" : undefined}
                // 고른 것만 테두리가 보인다. 나머지도 같은 두께의 투명 테두리를 둬서 줄이 흔들리지 않게 한다
                className={`block rounded-md border p-1 ${isCurrent ? "border-ink" : "border-transparent"}`}
              >
                <InventoryThumb filled>
                  {inventory.imageUrl && (
                    <Image src={inventory.imageUrl} alt="" fill sizes="52px" unoptimized className="object-cover" />
                  )}
                </InventoryThumb>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
