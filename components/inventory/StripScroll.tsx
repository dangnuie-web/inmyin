"use client";

import { useEffect, useRef, type ReactNode } from "react";

// 인벤토리 띠의 가로 줄. 고른 칸이 띠 밖에 있으면 보이는 곳까지 데려온다 —
// **고른 것이 바뀌었을 때만** (ChipRow 와 같은 규칙. 매번 하면 손가락으로 넘길 때마다 도로 끌려간다)
export function StripScroll({ className, children }: { className: string; children: ReactNode }) {
  const rowRef = useRef<HTMLUListElement>(null);
  const lastSelected = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const row = rowRef.current;
    const selected = row?.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]');
    if (!row || !selected || selected === lastSelected.current) return;
    // 처음 열 때는 바로 그 자리에서 보이고, 갈아탈 때만 미끄러진다
    const first = lastSelected.current === null;
    lastSelected.current = selected;
    const left = selected.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    const hidden = left < row.scrollLeft || left + selected.offsetWidth > row.scrollLeft + row.clientWidth;
    if (hidden) row.scrollTo({ left: left - (row.clientWidth - selected.offsetWidth) / 2, behavior: first ? "auto" : "smooth" });
  });
  return (
    <ul ref={rowRef} className={className}>
      {children}
    </ul>
  );
}
