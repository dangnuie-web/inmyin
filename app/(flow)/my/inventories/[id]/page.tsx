import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InventoryBoard } from "@/components/inventory/InventoryBoard";
import { toGridColumns } from "@/components/inventory/Slot";
import { InventoryStrip } from "@/components/inventory/InventoryStrip";
import { ViewToggle } from "@/components/inventory/ViewToggle";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ChipRow } from "@/components/ui/ChipRow";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPath, packingPath, type InventoryView } from "@/lib/inventory/paths";
import { getMyInventories, getMyInventoryDetail } from "@/lib/inventory/queries";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-04 · My › 인벤토리 상세. 하단 탭이 없는 화면이라 (flow) 묶음에 둔다.
export default async function InventoryDetailPage(props: PageProps<"/my/inventories/[id]">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  if (!UUID_PATTERN.test(id)) notFound();

  // 방금 지운 아이템. 제자리에 "되돌리기" 칸으로 잠깐 남긴다
  const deletedId =
    typeof searchParams.deleted === "string" && UUID_PATTERN.test(searchParams.deleted) ? searchParams.deleted : null;

  const [inventory, inventories] = await Promise.all([
    getMyInventoryDetail(profile.id, id, deletedId),
    getMyInventories(profile.id),
  ]);
  if (!inventory) notFound();

  const view: InventoryView = searchParams.view === "list" ? "list" : "grid";
  // 주소에 적힌 카테고리가 이 인벤토리의 태그일 때만 거른다. 아니면 전체
  const category =
    typeof searchParams.category === "string" && inventory.categories.includes(searchParams.category)
      ? searchParams.category
      : null;
  // 태그가 없는 아이템은 전체에서만 보인다 (CLAUDE.md 규칙 4)
  const entries = category ? inventory.entries.filter((entry) => entry.category === category) : inventory.entries;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <HeaderMini
        icon="back"
        href="/my/inventories"
        title="INVENTORY"
        action={
          <Link
            href={packingPath(inventory.id)}
            className="rounded-sm border border-border bg-white px-3 py-0.5 text-body font-bold active:opacity-60"
          >
            짐싸기
          </Link>
        }
      />

      <div className="mt-5">
        <InventoryStrip inventories={inventories} currentId={inventory.id} hrefFor={(inventoryId) => inventoryPath(inventoryId, { view })} />
      </div>

      {/* 토글은 제자리에 있고, 칩만 그 오른쪽에서 옆으로 넘어간다 — 칩을 넘겨 본 뒤에도 보기 방식을 바로 바꿀 수 있다 */}
      <div className="mt-9 flex items-center gap-2.5 pl-5">
        <ViewToggle current={view} hrefFor={(next) => inventoryPath(inventory.id, { view: next, category })} />
        <ChipRow className="min-w-0 flex-1">
          <CategoryTag label="전체" selected={!category} href={inventoryPath(inventory.id, { view })} />
        {inventory.categories.map((tag) => (
          <CategoryTag
            key={tag}
            label={tag}
            selected={tag === category}
            href={inventoryPath(inventory.id, { view, category: tag })}
          />
        ))}
        </ChipRow>
      </div>

      <InventoryBoard
        inventoryId={inventory.id}
        inventories={inventories}
        addedId={typeof searchParams.added === "string" ? searchParams.added : null}
        deletedId={deletedId}
        entries={entries}
        usedSlots={inventory.entries.filter((entry) => !entry.deleted).length}
        slotCount={inventory.slotCount}
        view={view}
        columns={toGridColumns(profile.grid_columns)}
      />
    </main>
  );
}
