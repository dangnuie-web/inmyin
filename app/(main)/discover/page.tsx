import type { Metadata } from "next";
import Link from "next/link";
import { UserBlock } from "@/components/discover/UserBlock";
import { TAB_CLASS } from "@/components/home/HomeTabs";
import { getViewer } from "@/lib/auth/profile";
import { DISCOVER_PATH, loginPath } from "@/lib/auth/paths";
import { getMyFollowingIds } from "@/lib/follow/queries";
import { getDiscoverUsers, RECOMMEND_THRESHOLD, type DiscoverMode } from "@/lib/ranking";

export const metadata: Metadata = { title: "발견 · INMYIN" };

const MODES: { id: DiscoverMode; label: string }[] = [
  { id: "recommend", label: "추천" },
  { id: "popular", label: "인기" },
];

// H-05 · 발견 (하단 탭의 두 번째, 2026-10-20 홈 갈래에서 나옴). 사람을 찾는 탭 — 추천(누적 북마크 100 미만인 사람 중 최근 1시간 북마크 순) · 인기(최근 24시간 북마크 순).
// 줄마다 그 사람의 최근 INMYIN 세 개와 팔로우 버튼. 순서는 DB 함수(discover_users)가 정한다 — 점수가 같으면 최근에 올린 사람 먼저.
// 로그인 없이도 열린다 — 랜딩의 "유저 인벤토리 보기"가 여기로 온다. 팔로우를 누르면 로그인으로
export default async function DiscoverPage(props: PageProps<"/discover">) {
  const profile = await getViewer();
  const searchParams = await props.searchParams;
  const mode: DiscoverMode = searchParams.mode === "popular" ? "popular" : "recommend";

  const [users, followingIds] = await Promise.all([getDiscoverUsers(mode), profile ? getMyFollowingIds(profile.id) : new Set<string>()]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      {/* 제목 줄 — 홈 갈래 줄과 같은 자리 · 크기 · 밑줄. 종은 없다(알림은 홈에서). 로그인 안 했으면 폰에서만 오른쪽 끝에 로그인 (웹은 상단 바에 있다) */}
      <div className="flex items-end px-5 pt-5 text-body font-bold text-ink">
        <h1 className={`${TAB_CLASS} border-ink`}>발견</h1>
        {!profile && (
          <Link href={loginPath(DISCOVER_PATH)} className={`${TAB_CLASS} ml-auto border-transparent active:opacity-60 lg:hidden`}>
            로그인
          </Link>
        )}
      </div>

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
        <ul className="mt-4 grid gap-10 px-5 pb-10 lg:grid-cols-2 lg:gap-x-6 xl:grid-cols-3">
          {users.map((user) => (
            <li key={user.id}>
              <UserBlock user={user} following={followingIds.has(user.id)} guest={!profile} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
