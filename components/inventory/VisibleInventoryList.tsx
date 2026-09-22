import type { InventorySummary } from "@/lib/inventory/queries";
import { otherInventoryPath } from "@/lib/profile/paths";
import { InventoryRow } from "./InventoryRow";

// 타유저의 인벤토리 목록 몸통 (H-07). 내 목록(M-03)과 같은 줄이지만 밀기 · + 줄 · TOTAL 이 없다. 웹은 두 줄로
export function VisibleInventoryList({ handle, inventories }: { handle: string; inventories: InventorySummary[] }) {
  if (inventories.length === 0) {
    return <p className="mt-16 break-keep px-5 text-center text-label text-ink-muted">공개된 인벤토리가 아직 없어요.</p>;
  }
  return (
    <ul className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-0 lg:[&>li]:border-b lg:[&>li]:border-border">
      {inventories.map((inventory) => (
        <li key={inventory.id}>
          <InventoryRow inventory={inventory} href={otherInventoryPath(handle, inventory.id)} />
        </li>
      ))}
    </ul>
  );
}
