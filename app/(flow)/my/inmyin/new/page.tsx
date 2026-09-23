import type { Metadata } from "next";
import { Editor } from "@/components/inmyin/Editor";
import { toGridColumns } from "@/components/inventory/Slot";
import { requireProfile } from "@/lib/auth/profile";
import { getMyPackingInventories } from "@/lib/inventory/queries";

export const metadata: Metadata = { title: "INMYIN 에디터 · INMYIN" };

// M-09 · INMYIN 에디터 (이미지 만들기 M-10 · 포스팅 M-11 도 이 화면 안에서). 내 프로필(M-01)의 INMYIN 줄에서 온다. 하단 탭이 없는 화면이라 (flow) 묶음에 둔다.
// 내 인벤토리 전부와 그 안의 아이템을 한 번에 읽는다 (짐싸기와 같은 조회) — 띠에서 갈아탈 때 서버를 기다리지 않게
export default async function InmyinEditorPage() {
  const profile = await requireProfile();
  const inventories = await getMyPackingInventories(profile.id);
  return <Editor inventories={inventories} columns={toGridColumns(profile.grid_columns)} userId={profile.id} />;
}
