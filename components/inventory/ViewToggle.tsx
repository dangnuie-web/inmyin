import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { InventoryView } from "@/lib/inventory/paths";

const VIEWS = [
  { view: "grid", label: "그리드 보기" },
  { view: "list", label: "리스트 보기" },
] as const;

// 주소로 바꾸는 곳(M-04)은 hrefFor 를, 화면 안에서 바꾸는 곳(M-05 짐싸기)은 onSelect 를 준다
type ViewToggleProps = { current: InventoryView } & (
  | { hrefFor: (view: InventoryView) => string; onSelect?: undefined }
  | { onSelect: (view: InventoryView) => void; hrefFor?: undefined }
);

// 피그마 `그리드-리스트 토글`. 색만 피그마와 다르다 — 회색 바탕은 옆의 카테고리 칩과 섞여 보여서
// 검정 바탕에 흰 아이콘으로 정했다. 지금 보기 방식은 흰색, 다른 쪽은 회색
export function ViewToggle({ current, hrefFor, onSelect }: ViewToggleProps) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-3.5 rounded-full bg-ink px-3.5">
      {VIEWS.map(({ view, label }) => {
        const className = view === current ? "text-white" : "text-ink-muted";
        return hrefFor ? (
          <Link
            key={view}
            href={hrefFor(view)}
            replace
            scroll={false}
            aria-label={label}
            aria-current={view === current ? "true" : undefined}
            className={className}
          >
            <Icon name={view} />
          </Link>
        ) : (
          <button key={view} type="button" onClick={() => onSelect(view)} aria-label={label} aria-pressed={view === current} className={className}>
            <Icon name={view} />
          </button>
        );
      })}
    </div>
  );
}
