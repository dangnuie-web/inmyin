import { SoonButton } from "@/components/profile/SoonButton";

// Home 안의 세 갈래 — 아이템(H-01) · INMYIN(H-03) · 발견(H-05). INMYIN 과 발견은 3단계라 자리만 잡아 둔다
const TABS = [
  { id: "items", label: "아이템", notice: "" },
  { id: "inmyin", label: "INMYIN", notice: "INMYIN 게시물은 3단계에서 만들어요." },
  { id: "discover", label: "발견", notice: "발견 탭은 3단계에서 만들어요." },
] as const;

export function HomeTabs({ current }: { current: (typeof TABS)[number]["id"] }) {
  return (
    <nav aria-label="Home 갈래" className="flex h-14 items-center gap-6 px-5 text-link font-bold">
      {TABS.map((tab) =>
        tab.id === current ? (
          <span key={tab.id} aria-current="page" className="text-ink">
            {tab.label}
          </span>
        ) : (
          <SoonButton key={tab.id} notice={tab.notice} className="text-ink-muted active:opacity-60">
            {tab.label}
          </SoonButton>
        ),
      )}
    </nav>
  );
}
