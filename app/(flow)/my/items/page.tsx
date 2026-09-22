import type { Metadata } from "next";
import { toGridColumns } from "@/components/inventory/Slot";
import { ItemCollection } from "@/components/item/ItemCollection";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getMyItemCollection } from "@/lib/item/queries";
import { planLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

// M-13 · 아이템 모아보기. 내 프로필(M-01)의 ITEM › 더보기에서 온다. 하단 탭이 없다
export default async function MyItemsPage() {
  const profile = await requireProfile();
  const items = await getMyItemCollection(profile.id);
  const { maxInventories, slotCount } = planLimits(profile.plan);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <HeaderMini icon="back" href="/my" title="아이템" />
      <ItemCollection
        items={items}
        capacity={maxInventories * slotCount}
        columns={toGridColumns(profile.grid_columns)}
        emptyText="아직 등록한 아이템이 없어요. 인벤토리에서 + 를 눌러 넣어 보세요."
      />
    </main>
  );
}
