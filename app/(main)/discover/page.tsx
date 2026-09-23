import type { Metadata } from "next";
import Link from "next/link";
import { UserBlock } from "@/components/discover/UserBlock";
import { HomeTabs } from "@/components/home/HomeTabs";
import { requireProfile } from "@/lib/auth/profile";
import { getMyFollowingIds } from "@/lib/follow/queries";
import { hasUnreadNotifications } from "@/lib/notification/queries";
import { getDiscoverUsers, RECOMMEND_THRESHOLD, type DiscoverMode } from "@/lib/ranking";

export const metadata: Metadata = { title: "발견 · INMYIN" };

const MODES: { id: DiscoverMode; label: string }[] = [
  { id: "recommend", label: "추천" },
  { id: "popular", label: "인기" },
];

// H-05 · Home › 발견. 사람을 찾는 탭 — 추천(누적 북마크 100 미만인 사람 중 최근 1시간 북마크 순) · 인기(최근 24시간 북마크 순).
// 줄마다 그 사람의 최근 INMYIN 세 개와 팔로우 버튼. 순서는 DB 함수(discover_users)가 정한다 — 점수가 같으면 최근에 올린 사람 먼저
export default async function DiscoverPage(props: PageProps<"/discover">) {
  const profile = await requireProfile();
  const searchParams = await props.searchParams;
  const mode: DiscoverMode = searchParams.mode === "popular" ? "popular" : "recommend";

  const [users, followingIds, unread] = await Promise.all([getDiscoverUsers(mode), getMyFollowingIds(profile.id), hasUnreadNotifications()]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      <HomeTabs current="discover" unread={unread} />

      {/* 피그마 H-05: 오른쪽 끝에 추천 | 인기 */}
      <p className="mt-5 flex justify-end gap-1 px-5 text-label">
        {MODES.map((entry, index) => (
          <span key={entry.id} className="flex gap-1">
            {index > 0 && <span className="text-disabled">|</span>}
            <Link href={entry.id === "recommend" ? "/discover" : "/discover?mode=popular"} replace scroll={false} aria-current={mode === entry.id ? "true" : undefined} className={mode === entry.id ? "font-bold text-ink" : "text-ink-muted"}>
              {entry.label}
            </Link>
          </span>
        ))}
      </p>

      {users.length === 0 ? (
        <p className="mt-16 px-5 text-center text-body text-ink-muted">
          {mode === "recommend" ? `아직 추천할 사람이 없어요. 누적 북마크 ${RECOMMEND_THRESHOLD}개 미만인 사람 중에서 골라요.` : "다른 사람의 INMYIN 이 아직 없어요."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-10 px-5 pb-10 lg:grid-cols-2 lg:gap-x-6">
          {users.map((user) => (
            <li key={user.id}>
              <UserBlock user={user} following={followingIds.has(user.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
