import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/profile";
import { loginPath } from "@/lib/auth/paths";
import {
  addFlowCategory,
  addItemPath,
  inventoryPath,
  itemCameraPath,
  itemEditPath,
  NEW_INVENTORY_CAMERA_PATH,
  NEW_INVENTORY_EDIT_PATH,
} from "@/lib/inventory/paths";
import { getMyInventories, getMyItemStamps } from "@/lib/inventory/queries";
import { readLastInventoryId } from "@/lib/inventory/resolve-last-inventory";
import { chooseTarget, fallbackInventory } from "@/lib/inventory/target";

// 하단 탭 가운데 + · 웹 상단 "+ 추가 › 아이템 넣기" · 아이템 모아보기(M-13)의 +. 화면은 없고 갈 곳만 정한다
// (무늬 인벤토리고르기설계 v01 3-1 · 4절):
// - 기본으로 골라 둘 인벤토리 = 빈 칸 있는 것 중 카테고리(?category=, 그 카테고리 아이템이 가장 많은 곳) → 마지막에 연 것(쿠키) →
//   최근에 아이템을 넣은 곳 → 최근 만든 곳. 넣을 곳은 정보 입력(M-08) 맨 위 "넣을 곳" 줄에서 바꾼다
// - ?to=edit — 컴퓨터에서 사진을 먼저 골랐다 → 촬영을 건너뛰고 사진편집(M-07)으로. 아니면 촬영(M-06)
// - 모두 꽉 찼으면 찍기 전에 인벤토리로(거기에 "프리미엄으로 늘리기"가 있다). 인벤토리가 없으면 새 인벤토리 만들기
// 사진은 브라우저 메모리에 있어서, 부르는 쪽이 router.push 로 와야 살아 있다
export default async function AddPage(props: PageProps<"/add">) {
  const searchParams = await props.searchParams;
  const category = addFlowCategory(searchParams.category);
  const toEdit = searchParams.to === "edit";

  const profile = await getViewer();
  if (!profile) redirect(loginPath(addItemPath({ category, toEdit })));

  const [inventories, items, rememberedId] = await Promise.all([getMyInventories(profile.id), getMyItemStamps(profile.id), readLastInventoryId()]);
  if (inventories.length === 0) redirect(toEdit ? NEW_INVENTORY_EDIT_PATH : NEW_INVENTORY_CAMERA_PATH);

  const target = chooseTarget({ inventories, items, category, rememberedId });
  if (!target) redirect(inventoryPath(fallbackInventory({ inventories, items, rememberedId })!));

  redirect(toEdit ? itemEditPath(target, { category }) : itemCameraPath(target, { category }));
}
