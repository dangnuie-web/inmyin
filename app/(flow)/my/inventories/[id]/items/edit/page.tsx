import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PhotoEditor } from "@/components/item/PhotoEditor";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPath, newItemPath } from "@/lib/inventory/paths";
import { getMyInventoryDetail } from "@/lib/inventory/queries";

export const metadata: Metadata = { title: "사진편집 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-07 · 아이템 편집. 촬영(M-06)에서 사진을 찍거나 고른 뒤에 온다. 저장하면 정보 입력(M-08)으로 간다.
export default async function ItemEditPage(props: PageProps<"/my/inventories/[id]/items/edit">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();

  const inventory = await getMyInventoryDetail(profile.id, id);
  if (!inventory) notFound();
  // 꽉 찼으면 돌려보낸다. 거기에 "프리미엄으로 늘리기" 안내가 있다
  if (inventory.entries.length >= inventory.slotCount) redirect(inventoryPath(inventory.id));

  return <PhotoEditor closeHref={inventoryPath(inventory.id)} nextHref={newItemPath(inventory.id)} />;
}
