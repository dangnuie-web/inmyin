import type { Metadata } from "next";
import Link from "next/link";
import { toGridColumns } from "@/components/inventory/Slot";
import { ItemCollection } from "@/components/item/ItemCollection";
import { PROFILE_ACTION_CLASS } from "@/components/profile/ProfileParts";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { SoonButton } from "@/components/profile/SoonButton";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { requireProfile } from "@/lib/auth/profile";
import { getMyItemCollection } from "@/lib/item/queries";
import { planLimits } from "@/lib/plans";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

// M-13 · 아이템 모아보기. 폰은 내 프로필(M-01)의 ITEM › 더보기에서 오고 하단 탭이 없다. 웹은 프로필 틀의 ITEM 탭 안에
export default async function MyItemsPage() {
  const profile = await requireProfile();
  const [items, stats] = await Promise.all([getMyItemCollection(profile.id), getMyProfileStats(profile.id)]);
  const { maxInventories, slotCount } = planLimits(profile.plan);

  return (
    <ProfileShell
      person={{ ...profile, avatarUrl: profile.avatar_url, followerCount: stats.followerCount, followingCount: stats.followingCount }}
      mine
      tab="items"
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
        <HeaderMini icon="back" href="/my" title="아이템" />
      </div>
      <main className="flex flex-1 flex-col lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pt-6 lg:pb-4">
        <ItemCollection
          items={items}
          capacity={maxInventories * slotCount}
          columns={toGridColumns(profile.grid_columns)}
          emptyText="아직 등록한 아이템이 없어요. 인벤토리에서 + 를 눌러 넣어 보세요."
        />
      </main>
    </ProfileShell>
  );
}
