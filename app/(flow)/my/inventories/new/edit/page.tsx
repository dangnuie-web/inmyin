import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PhotoEditor } from "@/components/item/PhotoEditor";
import { requireProfile } from "@/lib/auth/profile";
import { NEW_INVENTORY_PATH } from "@/lib/inventory/paths";
import { returnToFrom, withReturnTo } from "@/lib/nav/return-to";
import { getMyInventories } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "사진편집 · INMYIN" };

// 인벤토리 사진 편집. 인벤토리 목록(M-03)의 + 에서 사진을 고르거나 찍은 뒤에 온다. 아이템 편집(M-07)과 같은 화면이다.
// 프로필 띠 + 칸에서 왔으면 ?back=(그 프로필) — × 는 그리로, 다음 화면에도 실어 보낸다
export default async function NewInventoryEditPage(props: PageProps<"/my/inventories/new/edit">) {
  const profile = await requireProfile();
  const back = returnToFrom(await props.searchParams);

  // 한도에 닿았으면 목록으로 돌려보낸다. 거기에 "인벤토리 늘리기" 버튼이 있다
  const inventories = await getMyInventories(profile.id);
  if (inventories.length >= planLimits(profile.plan).maxInventories) redirect("/my/inventories");

  return <PhotoEditor closeHref={back ?? "/my/inventories"} nextHref={withReturnTo(NEW_INVENTORY_PATH, back)} />;
}
