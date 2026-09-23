import type { Metadata } from "next";
import Link from "next/link";
import { FollowCounts } from "@/components/follow/FollowCounts";
import { Avatar } from "@/components/profile/Avatar";
import { MyInventoriesSection } from "@/components/inventory/MyInventoriesSection";
import { EmptyNote, RecentItems, RecentPosts, SectionTitle } from "@/components/profile/ProfileParts";
import { MyProfileActions, MyProfileCorner } from "@/components/profile/MyProfileActions";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { requireProfile } from "@/lib/auth/profile";
import { getMyInventories } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "프로필 · INMYIN" };

// M-01 · My › 내 프로필. My 탭의 기본 화면. 여기서 설정 · 인벤토리 · 아이템으로 갈라진다.
// 타유저 프로필(H-06)과 같은 틀이고, 위쪽 버튼(프로필 관리 · 공유)과 갈 곳(내 화면들)만 다르다
export default async function MyProfilePage() {
  const profile = await requireProfile();
  const [stats, inventories] = await Promise.all([getMyProfileStats(profile.id), getMyInventories(profile.id)]);
  const { maxInventories, slotCount } = planLimits(profile.plan);

  return (
    <ProfileShell
      person={{ ...profile, avatarUrl: profile.avatar_url, followerCount: stats.followerCount, followingCount: stats.followingCount }}
      mine
      tab="inventory"
      corner={<MyProfileCorner />}
      actions={<MyProfileActions handle={profile.handle} nickname={profile.nickname} />}
    >
      {/* 폰: 프로필 줄 · 버튼 · 세 줄(INVENTORY › ITEM › INMYIN) */}
      <div className="flex flex-1 flex-col pb-6 lg:hidden">
        <HeaderMini icon="settings" href="/my/settings" title="PROFILE" />

        <section className="flex items-center gap-8.5 px-5 pt-1">
          <Avatar url={profile.avatar_url} size={98} />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-caption font-bold">{profile.handle}</p>
            <p className="flex items-center gap-2 text-title font-bold">
              <span className="truncate">{profile.nickname}</span>
              {profile.plan === "premium" && (
                // 프리미엄 표시. 보라색 원 안의 별
                <span aria-label="프리미엄" className="flex size-4 shrink-0 items-center justify-center rounded-full bg-point text-[9px] leading-none text-white">
                  ★
                </span>
              )}
            </p>
            {/* 누르면 팔로워 · 팔로잉 목록(M-12) */}
            <FollowCounts handle={profile.handle} followerCount={stats.followerCount} followingCount={stats.followingCount} />
          </div>
        </section>

        <div className="mt-6 flex gap-1 px-5">
          <MyProfileActions handle={profile.handle} nickname={profile.nickname} />
        </div>

        <Link href="/my/inventories" className="mt-8.5 flex h-15.5 items-center border-y border-gray-3 px-5 active:opacity-60">
          <SectionTitle title="INVENTORY" note={`${inventories.length}/${maxInventories}`} />
          {/* 뒤로가기 화살표를 뒤집어 쓴다 */}
          <Icon name="back" className="-mr-1.25 ml-auto rotate-180" />
        </Link>

        <section className="border-b border-gray-3 pb-7">
          <div className="flex h-16 items-center px-5">
            <SectionTitle title="ITEM" note={`TOTAL ${stats.itemCount}/${maxInventories * slotCount}`} />
            <Link href="/my/items" className="ml-auto rounded-md bg-ink px-2.5 text-label font-bold text-white active:opacity-80">
              더보기
            </Link>
          </div>
          {stats.recentItems.length > 0 ? (
            <RecentItems items={stats.recentItems} />
          ) : (
            <EmptyNote>아직 등록한 아이템이 없어요. 인벤토리에서 + 를 눌러 넣어 보세요.</EmptyNote>
          )}
        </section>

        <section>
          <div className="flex h-16 items-center px-5">
            <SectionTitle title="INMYIN" note={`게시물 ${stats.postCount}`} />
            {/* 에디터(M-09)로. 게시물 목록은 3단계 뒤 항목 */}
            <Link href="/my/inmyin/new" className="ml-auto rounded-md bg-ink px-2.5 text-label font-bold text-white active:opacity-80">
              만들기
            </Link>
          </div>
          {stats.recentPosts.length > 0 ? <RecentPosts posts={stats.recentPosts} /> : <EmptyNote>아직 게시물이 없어요. 만들기를 눌러 첫 INMYIN 을 올려 보세요.</EmptyNote>}
        </section>
      </div>

      {/* 웹: 프로필 틀의 INVENTORY 탭 = 인벤토리 목록 (M-03 과 같은 몸통) */}
      <div className="hidden flex-1 flex-col lg:flex">
        <MyInventoriesSection inventories={inventories} maxInventories={maxInventories} slotCount={slotCount} />
      </div>
    </ProfileShell>
  );
}
