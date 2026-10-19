"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// 폰에서 스크롤해도 맨 위에 남는 한 줄 (갈래 줄 · 제목 줄 · 헤더미니). 2026-10-20 당니님 결정 — 무늬 설계서 3절 A안.
// 아이폰 상태 막대는 반투명이라 밑으로 지나가는 것이 뿌옇게 비친다 → 흰 바탕 헤더가 그 자리를 지키면 상태 막대 밑은 늘 흰색이다.
// - 흰 바탕 · 안전 영역(상태 막대)만큼 위 여백. 사파리에서는 0, 홈 화면 앱에서 내용이 상태 막대 뒤까지 그려지는 버전이면 그만큼
// - 붙었을 때만 아래에 1px 회색 선. 맨 위에서는 선이 없다(전과 같은 모습)
// - 웹(1024px 이상)은 상단 바(WebNav)만 붙고 이 줄은 흘러간다
// - z-10: 나중에 나오는 메뉴(DarkMenu 20) · 시트 · 모달(30~50) · 토스트(30)가 위에 온다
// - 설치 안내 띠(InstallGuideBand)는 루트 흐름 맨 위라, 띠가 보이는 동안은 이 줄이 띠 아래에 있다가 띠가 스크롤로 올라가면 화면 맨 위에 붙는다
// sticky 는 부모 상자 안에서만 붙는다 — 화면 내용 전체를 감싼 상자의 바로 안에 둔다 (짧은 div 로 감싸면 안 붙는다)
// phoneOnly — 웹에서는 아예 숨는 헤더(프로필 틀 안의 화면들. 웹은 프로필 줄과 탭이 대신한다). className 은 줄 상자에 붙는다
export function StickyTop({ children, phoneOnly = false, className = "" }: { children: ReactNode; phoneOnly?: boolean; className?: string }) {
  const hidden = phoneOnly ? "lg:hidden" : "";
  // 바로 위의 1px 감시선. 이것이 화면 위로 나가면 = 이 줄이 붙었다
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className={`h-px -mb-px ${hidden}`} />
      <div
        data-stuck={stuck}
        className={`sticky top-0 z-10 bg-white pt-[env(safe-area-inset-top)] data-[stuck=true]:shadow-[inset_0_-1px_0_var(--color-border)] lg:static lg:pt-0 lg:data-[stuck=true]:shadow-none ${hidden} ${className}`}
      >
        {children}
      </div>
    </>
  );
}
