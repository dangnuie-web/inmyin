import type { ReactNode } from "react";

// 목록 위의 세 가지 — 그리드/리스트 토글 · 검색칸 · 카테고리 칩 — 를 폰과 웹에서 다르게 놓는다 (Home · Like · 모아보기 공용).
//   폰: [토글][검색칸] 한 줄, 그 아래 칩 한 줄 (옆으로 넘긴다)
//   웹(피그마): [칩 …………][검색칸][토글] 한 줄
// 같은 부품을 자리만 바꾸는 것이라 CSS 격자의 칸 번호로 옮긴다
export function ListControls({ toggle, search, chips }: { toggle: ReactNode; search: ReactNode; chips: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 px-5 lg:grid-cols-[1fr_20rem_auto]">
      <div className="col-start-1 row-start-1 lg:col-start-3">{toggle}</div>
      <div className="col-start-2 row-start-1 min-w-0 lg:col-start-2">{search}</div>
      <div className="col-span-2 row-start-2 -mx-5 min-w-0 lg:col-span-1 lg:col-start-1 lg:row-start-1 lg:mx-0">{chips}</div>
    </div>
  );
}
