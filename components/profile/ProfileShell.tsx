import Link from "next/link";
import type { ReactNode } from "react";
import { FollowCounts } from "@/components/follow/FollowCounts";
import { otherInventoriesPath, otherItemsPath, otherPostsPath } from "@/lib/profile/paths";
import { Avatar } from "./Avatar";

export type ProfileShellTab = "inventory" | "items" | "inmyin";

type ProfileShellProps = {
  person: {
    handle: string;
    nickname: string;
    avatarUrl: string | null;
    bio?: string | null;
    followerCount: number;
    followingCount: number;
  };
  // 내 프로필이면 줄들이 내 화면(/my/…)으로, 아니면 그 사람의 화면(/u/…)으로 간다
  mine: boolean;
  tab: ProfileShellTab;
  // 프로필 줄 오른쪽 위 (톱니 · ⋮)
  corner?: ReactNode;
  // 프로필 줄 오른쪽 아래의 버튼들 (프로필 관리 · 공유 / 팔로우 · 공유)
  actions: ReactNode;
  children: ReactNode;
};

// 프로필 틀 — 피그마 M-01 · H-06 (웹). 웹(1024px 이상)에서는 프로필 줄 아래 INVENTORY · ITEM · INMYIN 탭이 있고,
// 인벤토리 목록 · 인벤토리 상세 · 아이템 모아보기가 그 탭 안에서 펼쳐진다. 폰에서는 화면들이 따로따로라 프로필 줄과 탭은 숨고
// children 만 보인다 — 그래서 children 은 한 번만 그려진다 (같은 부품을 폰용 · 웹용으로 두 번 그리지 않는다)
export function ProfileShell({
  person,
  mine,
  tab,
  corner,
  actions,
  children,
}: ProfileShellProps) {
  const tabs: { id: ProfileShellTab; label: string; href: string }[] = [
    {
      id: "inventory",
      label: "INVENTORY",
      href: mine ? "/my/inventories" : otherInventoriesPath(person.handle),
    },
    {
      id: "items",
      label: "ITEM",
      href: mine ? "/my/items" : otherItemsPath(person.handle),
    },
    {
      id: "inmyin",
      label: "INMYIN",
      href: mine ? "/my/inmyin" : otherPostsPath(person.handle),
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      <div className="hidden px-5 lg:block">
        <section className="flex items-start gap-8.5 pt-10">
          <Avatar url={person.avatarUrl} size={98} />
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-3">
            <p className="truncate text-caption font-bold">{person.handle}</p>
            <p className="truncate text-title font-bold">{person.nickname}</p>
            <FollowCounts handle={person.handle} followerCount={person.followerCount} followingCount={person.followingCount} />
            {person.bio && (
              <p className="mt-1 break-keep text-label">{person.bio}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex h-8 items-center">{corner}</div>
            <div className="flex gap-2.5 [&>*]:h-9 [&>*]:w-29 [&>*]:rounded-full">
              {actions}
            </div>
          </div>
        </section>

        <nav
          aria-label="프로필 갈래"
          className="mt-9 flex items-end gap-14 border-b border-border px-3 text-title font-bold"
        >
          {tabs.map((entry) =>
            <Link
              key={entry.id}
              href={entry.href}
              aria-current={entry.id === tab ? "page" : undefined}
              className={`-mb-px border-b-2 pb-4 ${entry.id === tab ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
            >
              {entry.label}
            </Link>,
          )}
        </nav>
      </div>

      {children}
    </div>
  );
}
