"use client";

import { useCallback, useState, useTransition } from "react";
import { setLike } from "@/app/(flow)/items/[itemId]/like-actions";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import type { LikeTarget } from "@/lib/like/queries";

type LikeButtonProps = {
  targetType: LikeTarget;
  targetId: string;
  // 들어올 때의 상태. 그 뒤로는 이 부품이 스스로 들고 있는다
  liked: boolean;
  count: number;
};

// 하트 + 좋아요 수 (H-02 제목 줄). 누르면 화면부터 바뀌고 서버에 저장한다 — 실패하면 되돌리고 알린다.
// 켜지면 primary(분홍빨강)로 채운 하트, 꺼지면 검은 테두리 하트
export function LikeButton({ targetType, targetId, liked: initialLiked, count: initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((current) => Math.max(0, current + (next ? 1 : -1)));
    startTransition(async () => {
      const result = await setLike(targetType, targetId, next);
      if (!result.error) return;
      setLiked(!next);
      setCount((current) => Math.max(0, current + (next ? -1 : 1)));
      setNotice(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={liked}
        aria-label={liked ? "좋아요 취소" : "좋아요"}
        className={`flex shrink-0 items-center gap-1.5 text-title font-bold transition-transform active:scale-90 ${liked ? "text-primary" : "text-ink"}`}
      >
        <Icon name={liked ? "heartFilled" : "heart"} scale={0.5} />
        <span className="text-ink">{count}</span>
      </button>
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}
