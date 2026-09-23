"use client";

import { Icon } from "@/components/ui/Icon";

// 입력칸과 목록이 자기를 알리는 id. CommentSection 이 같은 값을 쓴다
export const COMMENT_SECTION_ID = "comments";
export const COMMENT_INPUT_ID = "comment-input";

// 말풍선 + 댓글 수 (제목 줄, 하트와 북마크 사이). 누르면 아래 댓글 칸으로 내려가고 입력칸에 커서가 간다.
// 수는 서버가 준 것(items.comment_count) — 댓글을 쓰면 서버 동작이 화면을 다시 받아 와 맞춰진다
export function CommentCount({ count }: { count: number }) {
  function jump() {
    document.getElementById(COMMENT_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById(COMMENT_INPUT_ID)?.focus({ preventScroll: true });
  }

  return (
    <button type="button" onClick={jump} aria-label={`댓글 ${count}개`} className="flex shrink-0 items-center gap-1.5 text-title font-bold text-ink transition-transform active:scale-90">
      <Icon name="comment" scale={0.5} />
      <span>{count}</span>
    </button>
  );
}
