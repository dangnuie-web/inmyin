import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PhotoEditor } from "@/components/item/PhotoEditor";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryUpdatePath } from "@/lib/inventory/paths";
import { getMyInventoryDetail } from "@/lib/inventory/queries";
import { returnToFrom } from "@/lib/nav/return-to";

export const metadata: Metadata = { title: "사진편집 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 인벤토리 수정의 사진 바꾸기 · 사진편집(M-07). 저장하기를 누르면 새 사진을 들고 수정 화면으로 돌아간다 — 실제로 바뀌는 건 거기서 수정하기를 눌렀을 때
export default async function InventoryPhotoEditPage(props: PageProps<"/my/inventories/[id]/edit/photo">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();
  if (!(await getMyInventoryDetail(profile.id, id))) notFound();
  // 수정 화면이 들고 있던 돌아갈 곳을 그대로 넘겨 준다
  const back = returnToFrom(await props.searchParams);

  return <PhotoEditor closeHref={inventoryUpdatePath(id, back)} nextHref={inventoryUpdatePath(id, back)} />;
}
