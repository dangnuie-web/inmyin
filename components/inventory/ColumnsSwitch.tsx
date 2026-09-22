"use client";

import { useRouter } from "next/navigation";
import { GRID_COLUMN_CHOICES, GRID_COLUMNS_COOKIE, type GridColumns } from "./Slot";

// 값은 쿠키에 두어 서버가 첫 화면부터 그 칸 수로 그린다 (lib/inventory/grid-columns.ts). 1년 동안 남는다
function saveColumns(columns: GridColumns) {
  document.cookie = `${GRID_COLUMNS_COOKIE}=${columns}; path=/; max-age=31536000; samesite=lax`;
}

// 격자 한 줄의 칸 수를 3 · 4 · 5 로 바꿔 보는 임시 스위치 (M-04). 어느 쪽이 좋은지 정해지면 뗀다
export function ColumnsSwitch({ current }: { current: GridColumns }) {
  const router = useRouter();

  function pick(columns: GridColumns) {
    saveColumns(columns);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5 text-caption text-ink-muted">
      <span>한 줄에</span>
      <div className="flex overflow-hidden rounded-full border border-disabled">
        {GRID_COLUMN_CHOICES.map((columns) => (
          <button
            key={columns}
            type="button"
            onClick={() => pick(columns)}
            aria-pressed={columns === current}
            className={`w-7 py-0.5 ${columns === current ? "bg-ink text-white" : "text-ink"}`}
          >
            {columns}
          </button>
        ))}
      </div>
      <span>칸</span>
    </div>
  );
}
