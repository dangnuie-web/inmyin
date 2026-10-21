import { NumText } from "@/components/ui/NumText";
import { PLANS } from "@/lib/plans";

const ROWS = [
  { label: "인벤토리", basic: `${PLANS.basic.maxInventories}개`, premium: `${PLANS.premium.maxInventories}개` },
  { label: "판마다 칸", basic: `${PLANS.basic.slotCount}칸`, premium: `${PLANS.premium.slotCount}칸` },
  {
    label: "북마크",
    basic: `${PLANS.basic.maxBookmarks.toLocaleString("ko-KR")}개`,
    premium: `${PLANS.premium.maxBookmarks.toLocaleString("ko-KR")}개`,
  },
];

// 베이직 → 프리미엄 한도 비교. 값은 lib/plans.ts 에서만 온다
export function PlanCompare() {
  return (
    <ul className="border-t border-gray-3">
      {ROWS.map((row) => (
        <li key={row.label} className="flex h-12 items-center justify-between border-b border-gray-3 text-body">
          {row.label}
          <span className="flex items-center gap-2">
            <span className="text-ink-muted">
              <NumText text={row.basic} />
            </span>
            <span aria-label="에서" className="text-ink-muted">
              →
            </span>
            <span className="font-bold">
              <NumText text={row.premium} />
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// 프리미엄 끝나는 날 (한국 날짜, 26.11.21)
export function formatUntil(value: string) {
  const [year, month, day] = new Date(value).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).split("-");
  return `${year.slice(2)}.${month}.${day}`;
}
