import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PhotoEditor } from "@/components/item/PhotoEditor";
import { requireProfile } from "@/lib/auth/profile";
import { itemUpdatePath } from "@/lib/inventory/paths";
import { getMyItemDetail } from "@/lib/item/queries";

export const metadata: Metadata = { title: "사진편집 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 아이템 수정의 사진 바꾸기 · 사진편집(M-07). 저장하기를 누르면 새 사진을 들고 수정 화면으로 돌아간다 — 실제로 바뀌는 건 거기서 수정하기를 눌렀을 때
export default async function ItemPhotoEditPage(props: PageProps<"/items/[itemId]/edit/photo">) {
  const profile = await requireProfile();
  const { itemId } = await props.params;
  if (!UUID_PATTERN.test(itemId)) notFound();
  if (!(await getMyItemDetail(profile.id, itemId))) notFound();

  return <PhotoEditor closeHref={itemUpdatePath(itemId)} nextHref={itemUpdatePath(itemId)} />;
}
