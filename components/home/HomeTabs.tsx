import { SoonButton } from "@/components/profile/SoonButton";

// Home 안의 세 갈래 — 아이템(H-01) · INMYIN(H-03) · 발견(H-05). INMYIN 과 발견은 3단계라 자리만 잡아 둔다
const TABS = [
  { id: "items", label: "아이템", notice: "" },
  { id: "inmyin", label: "INMYIN", notice: "INMYIN 게시물은 3단계에서 만들어요." },
  { id: "discover", label: "발견", notice: "발견 탭은 3단계에서 만들어요." },
] as const;

// 피그마 H-01: 셋 다 검정 글자이고, 고른 것에만 밑줄. 밑줄은 글자보다 살짝 넓다
const TAB_CLASS = "-mx-0.5 border-b-2 px-0.5 pb-1.5";

export function HomeTabs({ current }: { current: (typeof TABS)[number]["id"] }) {
  return (
    <nav aria-label="Home 갈래" className="flex h-14 items-center gap-9 px-5 text-body font-bold text-ink">
      {TABS.map((tab) =>
        tab.id === current ? (
          <span key={tab.id} aria-current="page" className={`${TAB_CLASS} border-ink`}>
            {tab.label}
          </span>
        ) : (
          <SoonButton key={tab.id} notice={tab.notice} className={`${TAB_CLASS} border-transparent active:opacity-60`}>
            {tab.label}
          </SoonButton>
        ),
      )}
    </nav>
  );
}
