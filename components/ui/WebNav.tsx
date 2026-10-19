"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// 웹(1024px 이상)의 상단 메뉴 — 하단 탭 대신. 이름과 갈 곳은 하단 탭과 같다 (BottomTab). 고른 메뉴에 밑줄.
// 피그마 웹 화면의 "Community · My · Save"를 앱 이름대로 Home · My · Bookmark 로 읽었다
const MENU = [
  { href: "/", label: "Home" },
  { href: "/my", label: "My" },
  { href: "/bookmark", label: "Bookmark" },
];

// /my/settings 처럼 더 깊이 들어가도 그 메뉴가 켜져 있어야 한다. My · Bookmark 에 속하지 않는 주소(/u/…, /items/…)는 모두 Home
function activeHref(pathname: string) {
  const entry = MENU.find(({ href }) => href !== "/" && (pathname === href || pathname.startsWith(`${href}/`)));
  return entry?.href ?? "/";
}

// account — 오른쪽 끝의 로그아웃 · 로그인 자리. 로그인 여부는 서버에서 읽어야 해서 레이아웃이 서버 컴포넌트(WebNavAccount)로 넣어 준다
export function WebNav({ account }: { account?: ReactNode }) {
  const current = activeHref(usePathname());

  return (
    <header className="hidden border-b border-border bg-white lg:block">
      <nav aria-label="상단 메뉴" className="mx-auto flex h-19 max-w-web items-stretch gap-14 px-5">
        <Link href="/" aria-label="INMYIN 홈" className="flex items-center active:opacity-60">
          <Image src="/logo.svg" alt="INMYIN" width={84} height={28} priority />
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
        <div className="ml-auto flex items-center">{account}</div>
      </nav>
    </header>
  );
}
