import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CameraScreen } from "@/components/item/CameraScreen";
import { requireProfile } from "@/lib/auth/profile";
import { itemPhotoEditPath, itemUpdatePath } from "@/lib/inventory/paths";
import { getMyItemDetail } from "@/lib/item/queries";

export const metadata: Metadata = { title: "촬영모드 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 아이템 수정의 사진 바꾸기 · 촬영(M-06). 찍으면 사진편집으로, × 는 수정 화면으로(사진은 그대로)
export default async function ItemPhotoCameraPage(props: PageProps<"/items/[itemId]/edit/camera">) {
  const profile = await requireProfile();
  const { itemId } = await props.params;
  if (!UUID_PATTERN.test(itemId)) notFound();
  if (!(await getMyItemDetail(profile.id, itemId))) notFound();

  return <CameraScreen closeHref={itemUpdatePath(itemId)} nextHref={itemPhotoEditPath(itemId)} />;
}
