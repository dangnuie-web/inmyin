import Image from "next/image";
import Link from "next/link";
import { inventoryPath, type InventoryView } from "@/lib/inventory/paths";
import type { InventorySummary } from "@/lib/inventory/queries";
import { InventoryThumb } from "./InventoryRow";

type InventoryStripProps = {
  inventories: InventorySummary[];
  currentId: string;
  view: InventoryView;
  // 인벤토리를 더 만들 수 있으면 끝에 빈 칸 하나를 보여준다
  canAddMore: boolean;
};

// M-04 위쪽의 인벤토리 띠. 내 인벤토리를 가로로 늘어놓고, 누르면 그 인벤토리로 갈아탄다.
export function InventoryStrip({ inventories, currentId, view, canAddMore }: InventoryStripProps) {
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
                  {inventory.imageUrl ? (
                    <Image src={inventory.imageUrl} alt="" fill sizes="52px" unoptimized className="object-cover" />
                  ) : (
                    // 사진이 없으면 이름 첫 글자로 구분한다 — 회색 칸만 나란히 있으면 뭐가 뭔지 알 수 없다
                    <span className="text-label font-bold text-ink-muted">{[...inventory.name][0]}</span>
                  )}
                </InventoryThumb>
              </Link>
            </li>
          );
        })}
        {canAddMore && (
          <li className="shrink-0 p-1.25" aria-hidden>
            <InventoryThumb />
          </li>
        )}
      </ul>
    </nav>
  );
}
