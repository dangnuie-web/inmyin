import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CameraScreen } from "@/components/item/CameraScreen";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPhotoEditPath, inventoryUpdatePath } from "@/lib/inventory/paths";
import { getMyInventoryDetail } from "@/lib/inventory/queries";
import { returnToFrom } from "@/lib/nav/return-to";

export const metadata: Metadata = { title: "촬영모드 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 인벤토리 수정의 사진 바꾸기 · 촬영(M-06). 찍으면 사진편집으로, × 는 수정 화면으로(사진은 그대로)
export default async function InventoryPhotoCameraPage(props: PageProps<"/my/inventories/[id]/edit/camera">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();
  if (!(await getMyInventoryDetail(profile.id, id))) notFound();
  // 수정 화면이 들고 있던 돌아갈 곳을 그대로 넘겨 준다
  const back = returnToFrom(await props.searchParams);

  return <CameraScreen closeHref={inventoryUpdatePath(id, back)} nextHref={inventoryPhotoEditPath(id, back)} />;
}
