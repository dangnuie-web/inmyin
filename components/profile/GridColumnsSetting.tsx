"use client";

import { useCallback, useState, useTransition } from "react";
import { updateGridColumns } from "@/app/(flow)/my/settings/actions";
import { GRID_COLUMN_CHOICES, type GridColumns } from "@/components/inventory/Slot";
import { Toast } from "@/components/ui/Toast";

// 설정(M-02)의 "격자 한 줄에 3칸 / 4칸". 누르면 화면부터 바꾸고 서버에 저장한다 — 실패하면 되돌리고 알린다
export function GridColumnsSetting({ current }: { current: GridColumns }) {
  const [columns, setColumns] = useState(current);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const [, startTransition] = useTransition();

  function pick(next: GridColumns) {
    if (next === columns) return;
    const previous = columns;
    setColumns(next);
    startTransition(async () => {
      const result = await updateGridColumns(next);
      if (!result.error) return;
      setColumns(previous);
      setNotice(result.error);
    });
  }

  return (
    <>
      <div className="flex overflow-hidden rounded-full border border-disabled text-caption font-bold">
        {GRID_COLUMN_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={() => pick(choice)}
            aria-pressed={choice === columns}
            className={`px-3 py-0.5 ${choice === columns ? "bg-ink text-white" : "text-ink"}`}
          >
            {choice}칸
          </button>
        ))}
      </div>
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}
