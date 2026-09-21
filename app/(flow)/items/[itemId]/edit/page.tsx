import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/item/ItemForm";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { itemPath } from "@/lib/inventory/paths";
import { getMyInventoryDetail } from "@/lib/inventory/queries";
import { getMyItemDetail } from "@/lib/item/queries";

export const metadata: Metadata = { title: "아이템 수정 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 아이템 수정. 정보 입력(M-08)과 같은 화면에 지금 값을 채워서 연다. 글자 정보만 고친다.
export default async function ItemUpdatePage(props: PageProps<"/items/[itemId]/edit">) {
  const profile = await requireProfile();
  const { itemId } = await props.params;
  if (!UUID_PATTERN.test(itemId)) notFound();

  const item = await getMyItemDetail(profile.id, itemId);
  if (!item) notFound();
  const inventory = await getMyInventoryDetail(profile.id, item.inventoryId);
  if (!inventory) notFound();

  return (
    <main className="flex flex-1 flex-col bg-surface-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <HeaderMini icon="close" href={itemPath(item.id)} title="저장하기" tone="dark" />
        <ItemForm userId={profile.id} inventoryId={inventory.id} categories={inventory.categories} item={item} />
      </div>
    </main>
  );
}
