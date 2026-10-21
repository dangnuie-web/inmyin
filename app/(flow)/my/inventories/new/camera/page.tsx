import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CameraScreen } from "@/components/item/CameraScreen";
import { requireProfile } from "@/lib/auth/profile";
import { NEW_INVENTORY_EDIT_PATH } from "@/lib/inventory/paths";
import { returnToFrom, withReturnTo } from "@/lib/nav/return-to";
import { getMyInventories } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "촬영모드 · INMYIN" };

// 인벤토리 사진 촬영. 인벤토리 목록(M-03)의 + › "사진 찍기"에서 온다. 아이템 촬영(M-06)과 같은 화면이다.
// 프로필 띠 + 칸에서 왔으면 ?back=(그 프로필) — × 는 그리로, 다음 화면에도 실어 보낸다
export default async function NewInventoryCameraPage(props: PageProps<"/my/inventories/new/camera">) {
  const profile = await requireProfile();
  const back = returnToFrom(await props.searchParams);

  // 한도에 닿았으면 찍기 전에 목록으로 돌려보낸다. 거기에 "인벤토리 늘리기" 버튼이 있다
  const inventories = await getMyInventories(profile.id);
  if (inventories.length >= planLimits(profile.plan).maxInventories) redirect("/my/inventories");

  return <CameraScreen closeHref={back ?? "/my/inventories"} nextHref={withReturnTo(NEW_INVENTORY_EDIT_PATH, back)} />;
}
