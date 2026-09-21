"use client";

import { useEffect, useRef, type ReactNode } from "react";

// 목록 위에서 거르는 칩들의 줄 (M-04 · M-13). 몇 개든 **한 줄**이고, 넘치면 손가락으로 옆으로 쓸어 넘긴다.
// 여러 줄로 접히면 태그 개수에 따라 목록의 시작 높이가 바뀌고, 정작 보려는 것이 밀려난다.
// (정보 입력 화면의 태그는 다르다 — 거기는 전부 보고 고르는 곳이라 여러 줄로 접힌다)
export function ChipRow({ className = "", children }: { className?: string; children: ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null);

  // 고른 칩이 화면 밖에 있으면 보이는 곳까지 데려온다. 지금 뭘 골랐는지 안 보이면 헷갈린다
  useEffect(() => {
    const row = rowRef.current;
    const selected = row?.querySelector<HTMLElement>('[aria-current="true"], [aria-pressed="true"]');
    if (!row || !selected) return;
    const left = selected.offsetLeft - row.offsetLeft;
    const hiddenLeft = left < row.scrollLeft + 24;
    const hiddenRight = left + selected.offsetWidth > row.scrollLeft + row.clientWidth - 40;
    if (hiddenLeft || hiddenRight) row.scrollTo({ left: left - (row.clientWidth - selected.offsetWidth) / 2, behavior: "smooth" });
  });

  return (
    <div
      ref={rowRef}
      // 오른쪽 끝을 흐리게 해서 "옆에 더 있다"는 것을 알린다. 맨 끝까지 넘기면 마지막 칩이 흐린 곳을 벗어나게 오른쪽 여백을 둔다
      className={`flex items-center gap-2.5 overflow-x-auto pr-10 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] ${className}`}
    >
      {children}
    </div>
  );
}
