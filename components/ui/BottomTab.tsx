"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlusMark, TabIcon, type TabIconName } from "./TabIcon";

// 다섯 자리 — 홈 · 발견 · + · 북마크 · 프로필 (2026-10-20 당니님 결정, 무늬 설계서 2절 A안). 홈이 맨 왼쪽, 가운데는 촬영.
// 이름은 한글. 웹 상단 메뉴(WebNav)도 같은 이름 · 같은 순서다
type Tab = { href: string; label: string; icon: TabIconName };
const LEFT: Tab[] = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/discover", label: "발견", icon: "discover" },
];
const RIGHT: Tab[] = [
  { href: "/bookmark", label: "북마크", icon: "bookmark" },
  { href: "/my", label: "프로필", icon: "profile" },
];
const TABS = [...LEFT, ...RIGHT];

// 가운데 + 가 가는 곳. 서버가 마지막에 연 인벤토리의 촬영 화면으로 보낸다 (app/(flow)/add)
export const ADD_PATH = "/add";

// /my/settings 처럼 더 깊이 들어가도 그 탭이 켜져 있어야 한다.
// 발견 · 프로필 · 북마크에 속하지 않는 주소(/inmyin, /u/…, /items/…, /notifications)는 모두 홈이다
export function activeTabHref(pathname: string) {
  const tab = TABS.find(({ href }) => href !== "/" && (pathname === href || pathname.startsWith(`${href}/`)));
  return tab?.href ?? "/";
}

function TabLink({ href, label, icon, current }: Tab & { current: string }) {
  const isActive = href === current;
  return (
    <li className="flex-1">
      <Link href={href} aria-current={isActive ? "page" : undefined} className="flex flex-col items-center gap-1 text-[11px] leading-[1.2] font-medium text-ink">
        <TabIcon name={icon} active={isActive} />
        {label}
      </Link>
    </li>
  );
}

export function BottomTab() {
  const current = activeTabHref(usePathname());

  return (
    // sticky — 내용이 짧으면 화면 맨 아래에, 길면 스크롤해도 아래에 붙어 있는다.
    // 아래 여백은 아이폰 홈 막대 영역과 기본 여백 중 큰 쪽. 위의 1px 회색 선은 격자가 밑으로 지나갈 때의 경계.
    // 웹(1024px 이상)에서는 상단 메뉴(WebNav)가 대신한다
    <nav
      aria-label="하단 탭"
      className="sticky bottom-0 bg-white px-5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--color-border)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {LEFT.map((tab) => (
          <TabLink key={tab.href} {...tab} current={current} />
        ))}
        {/* 가운데 + — 촬영. 이 앱의 주 동작이라 검정 원(40)으로 채운다. 라벨은 없고, 원의 가운데가 아이콘 줄의 가운데에 온다 (위아래 -8) */}
        <li className="flex flex-1 justify-center">
          <Link href={ADD_PATH} aria-label="아이템 촬영" className="-my-2 flex size-10 items-center justify-center self-start rounded-full bg-ink text-white active:opacity-80">
            <PlusMark />
          </Link>
        </li>
        {RIGHT.map((tab) => (
          <TabLink key={tab.href} {...tab} current={current} />
        ))}
      </ul>
    </nav>
  );
}
