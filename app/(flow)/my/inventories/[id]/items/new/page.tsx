import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ItemForm } from "@/components/item/ItemForm";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPath } from "@/lib/inventory/paths";
import { getMyInventoryDetail } from "@/lib/inventory/queries";

export const metadata: Metadata = { title: "아이템 등록 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-08 · 아이템 정보 입력. 인벤토리 상세(M-04)의 + 에서 사진을 고른 뒤에 온다.
export default async function NewItemPage(props: PageProps<"/my/inventories/[id]/items/new">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();

  const inventory = await getMyInventoryDetail(profile.id, id);
  if (!inventory) notFound();
  // 꽉 찼으면 돌려보낸다. 거기에 "프리미엄으로 늘리기" 안내가 있다
  if (inventory.entries.length >= inventory.slotCount) redirect(inventoryPath(inventory.id));

  return (
    <main className="flex flex-1 flex-col bg-surface-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <HeaderMini icon="close" href={inventoryPath(inventory.id)} title="저장하기" tone="dark" />
        <ItemForm userId={profile.id} inventoryId={inventory.id} categories={inventory.categories} />
      </div>
    </main>
  );
}
