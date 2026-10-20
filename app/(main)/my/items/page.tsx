import type { Metadata } from "next";
import { toGridColumns } from "@/components/inventory/Slot";
import { ItemCollection } from "@/components/item/ItemCollection";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { myShellProps } from "@/components/profile/ProfileShells";
import { requireProfile } from "@/lib/auth/profile";
import { getMyInventories } from "@/lib/inventory/queries";
import { hasRoom } from "@/lib/inventory/target";
import { getMyItemCollection } from "@/lib/item/queries";
import { planLimits } from "@/lib/plans";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

// M-13 · 내 프로필 › 아이템 탭 (아이템 모아보기). 폰도 웹도 프로필 줄 + 세 탭 아래에 펼쳐진다. 웹은 회색 판 안
export default async function MyItemsPage() {
  const profile = await requireProfile();
  const [items, stats, inventories] = await Promise.all([getMyItemCollection(profile.id), getMyProfileStats(profile.id), getMyInventories(profile.id)]);
  const { maxInventories, slotCount } = planLimits(profile.plan);

  return (
    <ProfileShell {...myShellProps(profile, stats)} tab="items">
      <div className="flex flex-1 flex-col pt-5 lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pt-6 lg:pb-4">
        <ItemCollection
          items={items}
          capacity={maxInventories * slotCount}
          columns={toGridColumns(profile.grid_columns)}
          addable
          // 인벤토리가 없으면 + 가 새 인벤토리 만들기로 간다(/add). 모두 꽉 찼으면 + 대신 "프리미엄으로 늘리기"
          canAdd={inventories.length === 0 || inventories.some(hasRoom)}
          empty={{ text: "아직 등록한 아이템이 없어요. 찍어 넣은 물건이 전부 여기에 모여요.", action: { label: "아이템 넣기", href: "/add" } }}
        />
      </div>
    </ProfileShell>
  );
}
