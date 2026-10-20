import type { Metadata } from "next";
import { MyInventoriesSection } from "@/components/inventory/MyInventoriesSection";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { StickyTop } from "@/components/ui/StickyTop";
import { requireProfile } from "@/lib/auth/profile";
import { getMyInventories } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "인벤토리 관리 · INMYIN" };

// M-03 · 인벤토리 관리 — 이름 · 순서 · 삭제 (무늬 빈화면프로필설계 v01 6절). 프로필 격자 이름 줄의 "관리"에서 온다.
// 설정과 같은 깊이라 하단 탭 없이 뒤로 헤더. 웹은 설정처럼 폰 모양을 가운데 448 로.
// 줄을 누르면 수정, 밀면 수정 · 삭제, 오른쪽 손잡이를 끌면 순서 (InventoryList). 격자는 없다 — 띠 · 격자는 프로필이 한다
export default async function InventoriesPage() {
  const profile = await requireProfile();
  const inventories = await getMyInventories(profile.id);
  const { maxInventories, slotCount } = planLimits(profile.plan);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <StickyTop>
        <HeaderMini icon="back" href="/my" title="인벤토리 관리" />
      </StickyTop>
      <MyInventoriesSection inventories={inventories} maxInventories={maxInventories} slotCount={slotCount} />
    </main>
  );
}
