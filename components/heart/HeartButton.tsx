"use client";

import { useCallback, useState, useTransition } from "react";
import { setHeart } from "@/app/(flow)/items/[itemId]/heart-actions";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import type { HeartTarget } from "@/lib/heart/queries";

type HeartButtonProps = {
  targetType: HeartTarget;
  targetId: string;
  // 들어올 때의 상태. 그 뒤로는 이 부품이 스스로 들고 있는다
  hearted: boolean;
  count: number;
};

// 하트 + 하트 수 (제목 줄, 북마크 왼쪽). 누르면 화면부터 바뀌고 서버에 저장한다 — 실패하면 되돌리고 알린다.
// 켜지면 primary(분홍빨강)로 채운 하트, 꺼지면 검은 테두리 하트. 수는 늘 검정
export function HeartButton({ targetType, targetId, hearted: initialHearted, count: initialCount }: HeartButtonProps) {
  const [hearted, setHearted] = useState(initialHearted);
  const [count, setCount] = useState(initialCount);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !hearted;
    setHearted(next);
    setCount((current) => Math.max(0, current + (next ? 1 : -1)));
    startTransition(async () => {
      const result = await setHeart(targetType, targetId, next);
      if (!result.error) return;
      setHearted(!next);
      setCount((current) => Math.max(0, current + (next ? -1 : 1)));
      setNotice(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={hearted}
        aria-label={hearted ? "하트 취소" : "하트"}
        className={`flex shrink-0 items-center gap-1.5 text-title font-bold transition-transform active:scale-90 ${hearted ? "text-primary" : "text-ink"}`}
      >
        <Icon name={hearted ? "heartFilled" : "heart"} scale={0.5} />
        <span className="text-ink">{count}</span>
      </button>
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}
