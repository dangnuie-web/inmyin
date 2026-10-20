"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { activeTabHref } from "./BottomTab";
import { PAGE_FADE } from "./page-fade";

// 웹(1024px 이상)의 상단 메뉴 — 하단 탭 대신. 이름 · 순서 · 갈 곳은 하단 탭과 같다 (BottomTab, 2026-10-20 홈 · 발견 · 북마크 · 프로필). 고른 메뉴에 밑줄.
// 하단 탭 가운데의 + (촬영)는 메뉴에 없다 — 대신 오른쪽 끝 account 자리에 "+ 추가"(WebNavAdd, 로그인했을 때만)
const MENU = [
  { href: "/", label: "홈" },
  { href: "/discover", label: "발견" },
  { href: "/bookmark", label: "북마크" },
  { href: "/my", label: "프로필" },
];

// account — 오른쪽 끝의 "+ 추가" · 로그아웃(또는 로그인) 자리. 로그인 여부는 서버에서 읽어야 해서 레이아웃이 서버 컴포넌트(WebNavAccount)로 넣어 준다
// 스크롤해도 맨 위에 붙어 있다(2026-10-20, 무늬 설계서 3-3). 갈래 줄은 흘러간다 — 폰의 StickyTop 은 웹에서 붙지 않는다
export function WebNav({ account }: { account?: ReactNode }) {
  const current = activeTabHref(usePathname());

  return (
    <header className="hidden border-b border-border bg-white lg:sticky lg:top-0 lg:z-10 lg:block">
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
                  transitionTypes={PAGE_FADE}
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
