import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Home 안의 세 갈래 — 아이템(H-01) · INMYIN(H-03) · 발견(H-05)
const TABS = [
  { id: "items", label: "아이템", href: "/" },
  { id: "inmyin", label: "INMYIN", href: "/inmyin" },
  { id: "discover", label: "발견", href: "/discover" },
] as const;

// 피그마 H-01: 셋 다 검정 글자이고, 고른 것에만 밑줄. 밑줄은 글자보다 살짝 넓고 글자 바로 아래(4px)에 붙는다 —
// leading-none 이 없으면 글줄 높이의 여백만큼 밑줄이 아래로 밀려 검색창 쪽에 가까워 보인다
const TAB_CLASS = "-mx-0.5 border-b-2 px-0.5 pb-1 leading-none";

type HomeTabsProps = {
  current: (typeof TABS)[number]["id"];
  // 안 본 알림이 있으면 종에 빨간 점
  unread: boolean;
};

// 오른쪽 끝의 종은 알림 화면(/notifications)으로. 갈래 줄과 같은 줄에 두어 홈을 열자마자 보인다 (폰 · 웹 같은 자리)
export function HomeTabs({ current, unread }: HomeTabsProps) {
  return (
    <nav aria-label="Home 갈래" className="flex items-end gap-9 px-5 pt-5 text-body font-bold text-ink">
      {TABS.map((tab) =>
        tab.id === current ? (
          <span key={tab.id} aria-current="page" className={`${TAB_CLASS} border-ink`}>
            {tab.label}
          </span>
        ) : (
          <Link key={tab.id} href={tab.href} className={`${TAB_CLASS} border-transparent active:opacity-60`}>
            {tab.label}
          </Link>
        ),
      )}
      <Link href="/notifications" aria-label={unread ? "알림 (새 알림 있음)" : "알림"} className="relative ml-auto -mb-1 active:opacity-60">
        <Icon name="bell" />
        {unread && <span aria-hidden className="absolute -top-0.5 right-0 size-2 rounded-full bg-primary" />}
      </Link>
    </nav>
  );
}
