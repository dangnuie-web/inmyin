"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabIcon, type TabIconName } from "./TabIcon";

// 순서는 피그마 그대로 — Home 이 가운데. 왼쪽은 원래 Like 였는데 북마크로 바뀌었다
const TABS: { href: string; label: string; icon: TabIconName }[] = [
  { href: "/bookmark", label: "Bookmark", icon: "bookmark" },
  { href: "/", label: "Home", icon: "home" },
  { href: "/my", label: "My", icon: "my" },
];

// /my/settings 처럼 더 깊이 들어가도 그 탭이 켜져 있어야 한다.
// My · Bookmark 에 속하지 않는 주소(/inmyin, /discover, /u/…)는 모두 Home 이다.
function activeHref(pathname: string) {
  const tab = TABS.find(
    ({ href }) => href !== "/" && (pathname === href || pathname.startsWith(`${href}/`)),
  );
  return tab?.href ?? "/";
}

export function BottomTab() {
  const current = activeHref(usePathname());

  return (
    // sticky — 내용이 짧으면 화면 맨 아래에, 길면 스크롤해도 아래에 붙어 있는다.
    // 아래 여백은 아이폰 홈 막대 영역과 기본 여백 중 큰 쪽. 웹(1024px 이상)에서는 상단 메뉴(WebNav)가 대신한다
    <nav
      aria-label="하단 탭"
      className="sticky bottom-0 bg-white px-5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {TABS.map(({ href, label, icon }) => {
          const isActive = href === current;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className="flex flex-col items-center gap-1 text-caption text-ink"
              >
                <TabIcon name={icon} active={isActive} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
