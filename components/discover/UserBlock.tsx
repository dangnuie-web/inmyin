import Image from "next/image";
import Link from "next/link";
import { FollowButton } from "@/components/follow/FollowButton";
import { Avatar } from "@/components/profile/Avatar";
import { postPath } from "@/lib/inmyin/paths";
import { formatShortDate } from "@/lib/item/rules";
import { profilePath } from "@/lib/profile/paths";
import type { DiscoverUser } from "@/lib/ranking";

// 발견 탭(H-05)의 한 사람 — 아바타 · 닉네임 · 최근에 올린 날 · 팔로우, 그 아래 최근 INMYIN 세 개 (피그마 H-05 웹)
export function UserBlock({ user, following }: { user: DiscoverUser; following: boolean }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <Link href={profilePath(user.handle)} className="flex min-w-0 flex-1 items-center gap-4 active:opacity-60">
          <Avatar url={user.avatarUrl} size={56} />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-body font-bold">{user.nickname}</span>
            <span className="text-caption text-ink-muted">{formatShortDate(new Date(user.latestPostAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }))}</span>
          </span>
        </Link>
        <FollowButton userId={user.id} following={following} />
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {user.posts.map((post) => (
          <li key={post.id}>
            <Link href={postPath(post.id)} className="relative block aspect-[4/5] overflow-hidden rounded-md border border-border bg-white active:opacity-80">
              <Image src={post.imageUrl} alt="" fill sizes="(min-width: 1024px) 150px, 30vw" unoptimized className="object-cover" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
