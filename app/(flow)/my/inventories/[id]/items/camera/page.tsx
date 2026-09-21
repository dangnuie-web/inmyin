import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CameraScreen } from "@/components/item/CameraScreen";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPath, itemEditPath } from "@/lib/inventory/paths";
import { getMyInventoryDetail } from "@/lib/inventory/queries";

export const metadata: Metadata = { title: "촬영모드 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-06 · 아이템 촬영. 인벤토리 상세(M-04)의 + › "새 아이템 등록"에서 온다. 찍으면 편집(M-07)으로 간다.
export default async function ItemCameraPage(props: PageProps<"/my/inventories/[id]/items/camera">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();

  const inventory = await getMyInventoryDetail(profile.id, id);
  if (!inventory) notFound();
  // 꽉 찼으면 찍기 전에 돌려보낸다. 거기에 "프리미엄으로 늘리기" 안내가 있다
  if (inventory.entries.length >= inventory.slotCount) redirect(inventoryPath(inventory.id));

  return <CameraScreen closeHref={inventoryPath(inventory.id)} nextHref={itemEditPath(inventory.id)} />;
}
