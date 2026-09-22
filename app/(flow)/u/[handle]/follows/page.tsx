import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/follow/FollowButton";
import { Avatar } from "@/components/profile/Avatar";
import { BackHeader } from "@/components/ui/BackHeader";
import { requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { getFollowLists, getMyFollowingIds, type UserCard } from "@/lib/follow/queries";
import { followsPath, type FollowTab } from "@/lib/profile/paths";

export const metadata: Metadata = { title: "팔로워 · INMYIN" };

// M-12 · 팔로워 · 팔로잉 목록. 내 것도 남의 것도 같은 화면 — 프로필의 숫자를 누르면 온다.
// 줄마다 팔로우 버튼이 있어서 여기서 바로 걸고 풀 수 있다. 나 자신의 줄에는 버튼이 없다
export default async function FollowsPage(props: PageProps<"/u/[handle]/follows">) {
  const profile = await requireProfile();
  const { handle } = await props.params;
  if (!HANDLE_PATTERN.test(handle)) notFound();
  const tab: FollowTab = (await props.searchParams).tab === "following" ? "following" : "followers";

  const [lists, myFollowing] = await Promise.all([getFollowLists(handle), getMyFollowingIds(profile.id)]);
  if (!lists) notFound();
  const people = tab === "followers" ? lists.followers : lists.following;

  const tabs: { tab: FollowTab; label: string; count: number }[] = [
    { tab: "followers", label: "팔로워", count: lists.followers.length },
    { tab: "following", label: "팔로잉", count: lists.following.length },
  ];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-10">
      <BackHeader title={lists.user.nickname} />

      {/* 두 갈래. Home 의 갈래와 같은 모양 — 고른 쪽에만 밑줄 */}
      <nav aria-label="팔로워 · 팔로잉" className="flex items-end gap-9 px-5 pt-3 text-body font-bold text-ink">
        {tabs.map((entry) => (
          <Link
            key={entry.tab}
            href={followsPath(handle, entry.tab)}
            replace
            aria-current={entry.tab === tab ? "page" : undefined}
            className={`-mx-0.5 border-b-2 px-0.5 pb-1 leading-none ${entry.tab === tab ? "border-ink" : "border-transparent active:opacity-60"}`}
          >
            {entry.label} {entry.count}
          </Link>
        ))}
      </nav>

      {people.length === 0 ? (
        <p className="mt-16 break-keep px-5 text-center text-label text-ink-muted">
          {tab === "followers" ? "아직 팔로워가 없어요." : "아직 팔로우한 사람이 없어요."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {people.map((person) => (
            <PersonRow key={person.id} person={person} isMe={person.id === profile.id} following={myFollowing.has(person.id)} />
          ))}
        </ul>
      )}
    </main>
  );
}

// 한 줄 — 사진 · 닉네임 · @아이디 · 팔로우 버튼. 타유저 프로필(H-06)을 만들면 누르면 거기로 간다
function PersonRow({ person, isMe, following }: { person: UserCard; isMe: boolean; following: boolean }) {
  return (
    <li className="flex h-16 items-center gap-3 px-5">
      <Avatar url={person.avatarUrl} size={44} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-label font-bold">{person.nickname}</span>
        <span className="truncate text-caption text-ink-muted">@{person.handle}</span>
      </span>
      {!isMe && <FollowButton userId={person.id} following={following} size="sm" />}
    </li>
  );
}
