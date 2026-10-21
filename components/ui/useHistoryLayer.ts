"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { closeBy, layerState, onLayerPop } from "@/lib/history/layer";

// 화면 위에 덮는 판을 폰 뒤로 가기로 닫히게 한다 (규칙은 lib/history/layer.ts).
// show — 같은 주소로 이력 한 칸을 쌓고 연다. hide — 닫기 · 완료 버튼용: 그 칸을 빼고(back) popstate 가 닫는다.
// 판이 닫히는 길은 popstate 하나뿐이라, 버튼으로 닫든 뒤로 가기로 닫든 이력과 화면이 어긋나지 않는다.
// onBack — 뒤로 가기로 닫힐 때만, 판이 사라지기 직전에 부른다(버튼으로 닫을 때는 안 부른다)
export function useHistoryLayer(name: string, onBack?: () => void) {
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  // 버튼으로 hide 했는지 — 그 back 이 만든 popstate 에서는 onBack 을 부르지 않는다
  const hidingRef = useRef(false);
  const onBackRef = useRef(onBack);
  useEffect(() => {
    openRef.current = open;
    onBackRef.current = onBack;
  });

  useEffect(() => {
    function onPop(event: PopStateEvent) {
      const action = onLayerPop(event.state, name, openRef.current);
      if (action === "close") {
        if (!hidingRef.current) onBackRef.current?.();
        hidingRef.current = false;
        openRef.current = false;
        setOpen(false);
      } else if (action === "skip") {
        window.history.back();
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [name]);

  const show = useCallback(() => {
    if (openRef.current) return;
    window.history.pushState(layerState(name), "");
    openRef.current = true;
    hidingRef.current = false;
    setOpen(true);
  }, [name]);

  const hide = useCallback(() => {
    if (!openRef.current) return;
    if (closeBy(window.history.state, name) === "back") {
      hidingRef.current = true;
      window.history.back();
    }
    else {
      openRef.current = false;
      setOpen(false);
    }
  }, [name]);

  return { open, show, hide };
}
