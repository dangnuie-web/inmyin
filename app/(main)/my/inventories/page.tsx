import type { Metadata } from "next";
import Link from "next/link";
import { MyInventoriesSection } from "@/components/inventory/MyInventoriesSection";
import { PROFILE_ACTION_CLASS } from "@/components/profile/ProfileParts";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { SoonButton } from "@/components/profile/SoonButton";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
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
      corner={
        <Link href="/my/settings" aria-label="설정" className="active:opacity-60">
          <Icon name="settings" scale={0.5} />
        </Link>
      }
      actions={
        <>
          <Link href="/my/edit" className={PROFILE_ACTION_CLASS}>
            프로필 관리
          </Link>
          <SoonButton notice="프로필 공유는 곧 만들어요." className={PROFILE_ACTION_CLASS}>
            프로필 공유
          </SoonButton>
        </>
      }
    >
      <div className="lg:hidden">
        <HeaderMini icon="back" href="/my" title="INVENTORY" />
      </div>
      <MyInventoriesSection inventories={inventories} maxInventories={maxInventories} slotCount={slotCount} />
    </ProfileShell>
  );
}
