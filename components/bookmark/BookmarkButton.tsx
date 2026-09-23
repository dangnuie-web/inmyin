"use client";

import { useCallback, useState, useTransition } from "react";
import { setBookmark } from "@/app/(flow)/items/[itemId]/bookmark-actions";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import type { BookmarkTarget } from "@/lib/bookmark/queries";

type BookmarkButtonProps = {
  targetType: BookmarkTarget;
  targetId: string;
  // 들어올 때의 상태. 그 뒤로는 이 부품이 스스로 들고 있는다
  bookmarked: boolean;
};

// 책갈피 (H-02 제목 줄의 맨 오른쪽). 누르면 화면부터 바뀌고 서버에 저장한다 — 실패하면 되돌리고 알린다.
// 켜지면 검게 채운 책갈피, 꺼지면 테두리만. 몇 명이 북마크했는지는 보여주지 않는다 (보이는 수는 하트 수)
export function BookmarkButton({ targetType, targetId, bookmarked: initialBookmarked }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const result = await setBookmark(targetType, targetId, next);
      if (!result.error) return;
      setBookmarked(!next);
      setNotice(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "북마크 해제" : "북마크"}
        className="flex shrink-0 items-center text-ink transition-transform active:scale-90"
      >
        <Icon name={bookmarked ? "bookmarkFilled" : "bookmark"} scale={0.5} />
      </button>
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}
