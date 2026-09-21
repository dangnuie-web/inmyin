import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { InventoryView } from "@/lib/inventory/paths";

const VIEWS = [
  { view: "grid", label: "그리드 보기" },
  { view: "list", label: "리스트 보기" },
] as const;

type ViewToggleProps = {
  current: InventoryView;
  // 그 보기 방식으로 바꾼 주소를 돌려준다
  hrefFor: (view: InventoryView) => string;
};

// 피그마 `그리드-리스트 토글`
export function ViewToggle({ current, hrefFor }: ViewToggleProps) {
  return (
    <div className="flex h-7 shrink-0 items-center gap-3.5 rounded-full bg-gray-2 px-3.5">
      {VIEWS.map(({ view, label }) => (
        <Link
          key={view}
          href={hrefFor(view)}
          replace
          scroll={false}
          aria-label={label}
          aria-current={view === current ? "true" : undefined}
          className={view === current ? "text-ink" : "text-disabled"}
        >
          <Icon name={view} />
        </Link>
      ))}
    </div>
  );
}
