"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

// 웹(1024px 이상)의 상단 메뉴 — 하단 탭 대신. 이름과 갈 곳은 하단 탭과 같다 (BottomTab). 고른 메뉴에 밑줄.
// 피그마 웹 화면의 "Community · My · Save"를 앱 이름대로 Home · My · Like 로 읽었다
const MENU = [
  { href: "/", label: "Home" },
  { href: "/my", label: "My" },
  { href: "/like", label: "Like" },
];

// /my/settings 처럼 더 깊이 들어가도 그 메뉴가 켜져 있어야 한다. My · Like 에 속하지 않는 주소(/u/…, /items/…)는 모두 Home
function activeHref(pathname: string) {
  const entry = MENU.find(({ href }) => href !== "/" && (pathname === href || pathname.startsWith(`${href}/`)));
  return entry?.href ?? "/";
}

export function WebNav() {
  const current = activeHref(usePathname());

  return (
    <header className="hidden border-b border-border bg-white lg:block">
      <nav aria-label="상단 메뉴" className="mx-auto flex h-19 max-w-web items-stretch gap-14 px-5">
        <Link href="/" aria-label="INMYIN 홈" className="flex items-center active:opacity-60">
          <Image src="/logo.svg" alt="INMYIN" width={73} height={16} priority />
        </Link>
        <ul className="flex items-stretch gap-14">
          {MENU.map(({ href, label }) => {
            const isActive = href === current;
            return (
              <li key={href} className="flex">
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center border-b-2 px-1 text-body font-bold ${isActive ? "border-ink text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
