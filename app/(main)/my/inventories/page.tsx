import type { Metadata } from "next";
import { MyInventoriesSection } from "@/components/inventory/MyInventoriesSection";
import { MyProfileActions, MyProfileCorner } from "@/components/profile/MyProfileActions";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getMyInventories } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

// M-03 · My › 인벤토리 목록. 폰은 헤더 아래 목록, 웹은 프로필 틀의 INVENTORY 탭 안에.
// 있는 인벤토리와 그 다음의 + 줄 하나만 그린다. 빈 자리는 그리지 않는다. 줄을 밀면 수정 · 삭제 (InventoryList)
export default async function InventoriesPage() {
  const profile = await requireProfile();
  const [inventories, stats] = await Promise.all([getMyInventories(profile.id), getMyProfileStats(profile.id)]);
  const { maxInventories, slotCount } = planLimits(profile.plan);

  return (
    <ProfileShell
      person={{ ...profile, avatarUrl: profile.avatar_url, followerCount: stats.followerCount, followingCount: stats.followingCount }}
      mine
      tab="inventory"
      corner={<MyProfileCorner />}
      actions={<MyProfileActions handle={profile.handle} nickname={profile.nickname} />}
    >
      <div className="lg:hidden">
        <HeaderMini icon="back" href="/my" title="INVENTORY" />
      </div>
      <MyInventoriesSection inventories={inventories} maxInventories={maxInventories} slotCount={slotCount} />
    </ProfileShell>
  );
}
