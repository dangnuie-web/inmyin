import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FollowButton } from "@/components/follow/FollowButton";
import { Avatar } from "@/components/profile/Avatar";
import { EmptyNote, PROFILE_ACTION_CLASS, RecentItems, SectionTitle } from "@/components/profile/ProfileParts";
import { SoonButton } from "@/components/profile/SoonButton";
import { BackHeader } from "@/components/ui/BackHeader";
import { Icon } from "@/components/ui/Icon";
import { requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { isFollowing } from "@/lib/follow/queries";
import { followsPath, otherInventoriesPath, otherItemsPath } from "@/lib/profile/paths";
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
  const [inventories, following] = await Promise.all([getVisibleInventories(person.id), isFollowing(profile.id, person.id)]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-6">
      <BackHeader title="PROFILE" />

      <section className="flex items-center gap-8.5 px-5 pt-1">
        <Avatar url={person.avatarUrl} size={98} />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="truncate text-caption font-bold">{person.handle}</p>
          <p className="truncate text-title font-bold">{person.nickname}</p>
          <p className="flex gap-2.5 text-label">
            <Link href={followsPath(person.handle, "followers")} className="active:opacity-60">
              팔로워 {person.followerCount.toLocaleString("ko-KR")}
            </Link>
            <Link href={followsPath(person.handle, "following")} className="active:opacity-60">
              팔로잉 {person.followingCount.toLocaleString("ko-KR")}
            </Link>
          </p>
        </div>
      </section>
      {person.bio && <p className="mt-4 break-keep px-5 text-label">{person.bio}</p>}

      <div className="mt-6 flex gap-1 px-5">
        {/* FollowButton 은 자기 크기를 가져서, 내 프로필의 버튼과 같은 크기가 되게 감싼다 */}
        <span className="flex flex-1 [&>button]:h-9.5 [&>button]:flex-1">
          <FollowButton userId={person.id} following={following} />
        </span>
        <SoonButton notice="프로필 공유는 곧 만들어요." className={PROFILE_ACTION_CLASS}>
          프로필 공유
        </SoonButton>
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
  );
}
