import Link from "next/link";
import type { ReactNode } from "react";
import { FollowCounts } from "@/components/follow/FollowCounts";
import { StickyTop } from "@/components/ui/StickyTop";
import { otherItemsPath, otherPostsPath, profilePath } from "@/lib/profile/paths";
import { Avatar } from "./Avatar";
import { LinkPending } from "@/components/ui/LinkPending";
import { PAGE_FADE } from "@/components/ui/page-fade";

export type ProfileShellTab = "inventory" | "items" | "inmyin";

type ProfileShellProps = {
  person: {
    handle: string;
    nickname: string;
    avatarUrl: string | null;
    bio?: string | null;
    followerCount: number;
    followingCount: number;
    // 프리미엄 별 (내 프로필)
    premium?: boolean;
  };
  // 내 프로필이면 탭이 내 화면(/my/…)으로, 아니면 그 사람의 화면(/u/…)으로 간다
  mine: boolean;
  tab: ProfileShellTab;
  // 프로필 줄 오른쪽 위 (톱니 · ⋮) — 웹
  corner?: ReactNode;
  // 프로필 줄의 버튼들 (프로필 관리 · 공유 / 팔로우 · 공유)
  actions: ReactNode;
  // 폰 맨 위 헤더 (톱니 · 프로필 / ‹ 프로필 ⋮). 주면 폰에서도 프로필 줄 · 버튼 · 탭 줄이 보인다(프로필의 세 탭).
  // 안 주면 폰에서는 children 만 (짐싸기처럼 프로필 틀을 웹에서만 두르는 화면)
  phoneHeader?: ReactNode;
  children: ReactNode;
};

// 프로필 틀 — 피그마 M-01 · H-06. 폰도 웹도 "프로필 줄 → 세 탭(인벤토리 · 아이템 · INMYIN) → 탭의 몸통" 한 틀이다
// (무늬 빈화면프로필설계 v01 2절). 폰은 세로로 쌓이고, 웹은 프로필 줄이 넓어지고 몸통이 회색 판에 들어간다.
// 프로필 줄은 폰용 · 웹용 모양이 달라 두 벌이지만, children(몸통)은 한 번만 그린다
export function ProfileShell({ person, mine, tab, corner, actions, phoneHeader, children }: ProfileShellProps) {
  const tabs: { id: ProfileShellTab; label: string; href: string }[] = [
    { id: "inventory", label: "인벤토리", href: mine ? "/my" : profilePath(person.handle) },
    { id: "items", label: "아이템", href: mine ? "/my/items" : otherItemsPath(person.handle) },
    { id: "inmyin", label: "INMYIN", href: mine ? "/my/inmyin" : otherPostsPath(person.handle) },
  ];

  const name = (
    <>
      <span className="truncate">{person.nickname}</span>
      {person.premium && (
        // 프리미엄 표시. 검정 원 안의 별
        <span aria-label="프리미엄" className="flex size-4 shrink-0 items-center justify-center rounded-full bg-ink text-[9px] leading-none text-white">
          ★
        </span>
      )}
    </>
  );

  return (
    // data-pending-scope · body — 세 탭을 누르면 답이 올 때까지 몸통이 흐려진다 (components/ui/LinkPending.tsx)
    <div data-pending-scope="shell" className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      {phoneHeader && (
        <>
          {/* sticky 는 부모 상자 안에서만 붙는다 — 화면 전체를 감싼 이 상자의 바로 안에 둔다 */}
          <StickyTop phoneOnly>{phoneHeader}</StickyTop>
          <div className="lg:hidden">
            <section className="flex items-center gap-8.5 px-5 pt-1">
              <Avatar url={person.avatarUrl} size={98} />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-caption font-bold">{person.handle}</p>
                <p className="flex items-center gap-2 text-title font-bold">{name}</p>
                {/* 누르면 팔로워 · 팔로잉 목록(M-12) */}
                <FollowCounts handle={person.handle} followerCount={person.followerCount} followingCount={person.followingCount} />
              </div>
            </section>
            {person.bio && <p className="mt-4 break-keep px-5 text-label">{person.bio}</p>}
            <div className="mt-6 flex gap-1 px-5">{actions}</div>
          </div>
        </>
      )}

      <div className="hidden px-5 lg:block">
        <section className="flex items-start gap-8.5 pt-10">
          <Avatar url={person.avatarUrl} size={98} />
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-3">
            <p className="truncate text-caption font-bold">{person.handle}</p>
            <p className="flex items-center gap-2 text-title font-bold">{name}</p>
            <FollowCounts handle={person.handle} followerCount={person.followerCount} followingCount={person.followingCount} />
            {person.bio && <p className="mt-1 break-keep text-label">{person.bio}</p>}
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex h-8 items-center">{corner}</div>
            <div className="flex gap-2.5 [&>*]:h-9 [&>*]:w-29 [&>*]:rounded-full">{actions}</div>
          </div>
        </section>
      </div>

      {/* 세 탭. 폰: 버튼 줄 아래 28 · 16px · 사이 36 · 밑줄이 화면 끝까지(홈 갈래 줄과 같은 모양). 웹: 20px · 사이 56 */}
      <div className={phoneHeader ? "lg:px-5" : "hidden lg:block lg:px-5"}>
        <nav aria-label="프로필 갈래" className="group/tabs mt-7 flex items-end gap-9 border-b border-border px-5 text-body font-bold lg:mt-9 lg:gap-14 lg:px-3 lg:text-title">
          {tabs.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href}
              // 세 탭은 화면에 들어오면 내용까지 미리 받는다(prefetch true) — 두 개뿐이고 같은 사람 것이라 가볍다.
              // 기본(뼈대까지만)이면 누른 뒤 서버를 한 번 더 다녀와야 해서 느린 폰 · 망에서 0.7초쯤 그대로 멈춰 있었다
              prefetch
              transitionTypes={PAGE_FADE}
              aria-current={entry.id === tab ? "page" : undefined}
              // 누르자마자 밑줄이 누른 탭으로 옮겨 간다 — 지금 탭은 표식이 생기면 회색, 누른 탭은 검정
              className={`-mb-px border-b-2 pb-3 lg:pb-4 ${
                entry.id === tab
                  ? "border-ink text-ink group-has-[[data-link-pending]]/tabs:border-transparent group-has-[[data-link-pending]]/tabs:text-ink-muted"
                  : "border-transparent text-ink-muted active:opacity-60 has-[[data-link-pending]]:border-ink has-[[data-link-pending]]:text-ink lg:hover:text-ink"
              }`}
            >
              {entry.label}
              <LinkPending scope="shell" />
            </Link>
          ))}
        </nav>
      </div>

      <div data-pending-body="shell" className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
