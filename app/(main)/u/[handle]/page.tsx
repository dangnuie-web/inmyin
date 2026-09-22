import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VisibleInventoryList } from "@/components/inventory/VisibleInventoryList";
import { FollowCounts } from "@/components/follow/FollowCounts";
import { Avatar } from "@/components/profile/Avatar";
import { OtherProfileActions, OtherProfileCorner } from "@/components/profile/OtherProfileActions";
import { EmptyNote, RecentItems, SectionTitle } from "@/components/profile/ProfileParts";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { Icon } from "@/components/ui/Icon";
import { requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { hasBlocked } from "@/lib/block/queries";
import { isFollowing } from "@/lib/follow/queries";
import { otherInventoriesPath, otherItemsPath } from "@/lib/profile/paths";
import { getPublicProfile, getVisibleInventories } from "@/lib/profile/public-queries";

export const metadata: Metadata = { title: "프로필 · INMYIN" };

// H-06 · 타유저 프로필. 내 프로필(M-01)과 같은 틀 — 위쪽 버튼이 팔로우 · 프로필 공유이고, 줄들은 그 사람의 화면(H-07 · 모아보기)으로 간다.
// 보이는 것만 센다 (비공개는 DB 규칙이 뺀다). 내 아이디를 열면 내 프로필로
export default async function OtherProfilePage(props: PageProps<"/u/[handle]">) {
  const profile = await requireProfile();
  const { handle } = await props.params;
  if (!HANDLE_PATTERN.test(handle)) notFound();
  if (handle === profile.handle) redirect("/my");

  const person = await getPublicProfile(handle);
  if (!person) notFound();
  const [inventories, following, blocked] = await Promise.all([getVisibleInventories(person.id), isFollowing(profile.id, person.id), hasBlocked(profile.id, person.id)]);

  const shellProps = {
    person,
    mine: false,
    corner: <OtherProfileCorner userId={person.id} blocked={blocked} />,
    actions: <OtherProfileActions userId={person.id} following={following} blocked={blocked} />,
  };

  return (
    <ProfileShell {...shellProps} tab="inventory">
      {/* 폰: 프로필 줄 · 버튼 · 세 줄(INVENTORY › ITEM › INMYIN) */}
        <div className="flex flex-1 flex-col pb-6 lg:hidden">
        {/* ⋮ 메뉴 — 차단하기 / 차단 해제. 차단했으면 아래의 숫자와 목록은 DB 규칙 때문에 비어 보인다 */}
        <BackHeader title="PROFILE" action={<OtherProfileCorner userId={person.id} blocked={blocked} />} />

        <section className="flex items-center gap-8.5 px-5 pt-1">
          <Avatar url={person.avatarUrl} size={98} />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-caption font-bold">{person.handle}</p>
            <p className="truncate text-title font-bold">{person.nickname}</p>
            <FollowCounts handle={person.handle} followerCount={person.followerCount} followingCount={person.followingCount} />
          </div>
        </section>
        {person.bio && <p className="mt-4 break-keep px-5 text-label">{person.bio}</p>}

        <div className="mt-6 flex gap-1 px-5">
          <OtherProfileActions userId={person.id} following={following} blocked={blocked} />
        </div>

        <Link href={otherInventoriesPath(person.handle)} className="mt-8.5 flex h-15.5 items-center border-y border-gray-3 px-5 active:opacity-60">
          <SectionTitle title="INVENTORY" note={`${inventories.length}`} />
          <Icon name="back" className="-mr-1.25 ml-auto rotate-180" />
        </Link>

        <section className="border-b border-gray-3 pb-7">
          <div className="flex h-16 items-center px-5">
            <SectionTitle title="ITEM" note={`${person.itemCount}`} />
            <Link href={otherItemsPath(person.handle)} className="ml-auto rounded-md bg-ink px-2.5 text-label font-bold text-white active:opacity-80">
              더보기
            </Link>
          </div>
          {person.recentItems.length > 0 ? <RecentItems items={person.recentItems} /> : <EmptyNote>공개된 아이템이 아직 없어요.</EmptyNote>}
        </section>

        <section>
          <div className="flex h-16 items-center pl-5">
            <SectionTitle title="INMYIN" note={`게시물 ${person.postCount}`} />
          </div>
          <EmptyNote>아직 게시물이 없어요.</EmptyNote>
        </section>
        </div>

      {/* 웹: 프로필 틀의 INVENTORY 탭 = 그 사람의 인벤토리 목록 (H-07 과 같은 몸통) */}
      <div className="hidden flex-1 flex-col lg:flex">
        <VisibleInventoryList handle={handle} inventories={inventories} />
      </div>
    </ProfileShell>
  );
}
