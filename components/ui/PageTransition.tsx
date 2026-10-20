"use client";

import { useEffect, useState, ViewTransition, type ReactNode } from "react";

// 화면 전환 페이드 — 하단 탭 · 웹 상단 메뉴 · 프로필 탭 줄 · 띠 · 격자 칸처럼 transitionTypes={PAGE_FADE} 를 단 Link 로 옮길 때만
// 몸통이 짧게 겹쳐 바뀐다(app/globals.css "화면 전환"). 하단 탭 · 웹 상단 메뉴는 이 상자 밖이라 움직이지 않는다.
// View Transitions API 를 지원하는 브라우저에서만 돌고, 아니면 지금처럼 바로 바뀐다. 움직임 줄이기면 CSS 가 끈다.
// 하트 · 저장 같은 화면 안의 변화, 브라우저 뒤로가기(아이폰은 밀어서 돌아가는 자체 연출이 있다)에는 이름표가 없어서 안 돈다.
// 이름표 PAGE_FADE 는 서버 컴포넌트도 쓰도록 components/ui/page-fade.ts 에 있다

// 스플래시가 아직 덮고 있는지 — html 의 splash-on 과 페이지를 연 뒤 지난 시간으로 판단한다
const SPLASH_MS = 1100;
function splashing() {
  return document.documentElement.classList.contains("splash-on") && performance.now() < SPLASH_MS;
}

export function PageTransition({ children }: { children: ReactNode }) {
  // 홈 화면 앱을 처음 열 때의 스플래시(components/Splash.tsx, 1초)가 걷히기 전에는 돌리지 않는다 —
  // 전환 동안 화면이 사진으로 바뀌어 스플래시의 흐려짐이 멈춰 보인다.
  // 처음 값을 그 자리에서 정한다 — (main) ↔ (flow) 를 넘나들면 이 상자가 새로 생기는데, 그때 바로 켜져 있어야 들어오는 화면이 페이드된다.
  // 서버에서는 꺼 둔다(이 값은 DOM 에 안 찍혀서 처음 그림이 어긋나지 않는다)
  const [ready, setReady] = useState(() => typeof document !== "undefined" && !splashing());
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setReady(true), Math.max(0, SPLASH_MS - performance.now()));
    return () => window.clearTimeout(timer);
  }, [ready]);

  return (
    // default 하나로 enter · exit · update 를 같이 정한다 — 같은 묶음 안의 이동은 update, (main) ↔ (flow) 를 넘나들면 exit · enter
    <ViewTransition default={ready ? { "page-fade": "page-fade", default: "none" } : "none"}>
      {children}
    </ViewTransition>
  );
}
