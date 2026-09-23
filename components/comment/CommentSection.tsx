"use client";

import Link from "next/link";
import { useCallback, useState, useTransition, type FormEvent } from "react";
import { addComment, deleteComment } from "@/app/(flow)/items/[itemId]/comment-actions";
import { SwipeRow } from "@/components/inventory/SlotGestures";
import { Avatar } from "@/components/profile/Avatar";
import { Toast } from "@/components/ui/Toast";
import type { Comment, CommentTarget } from "@/lib/comment/queries";
import { COMMENT_MAX } from "@/lib/comment/rules";
import { profilePath } from "@/lib/profile/paths";
import { timeAgo } from "@/lib/time";

type Row = Comment & {
  // 서버의 답을 기다리는 중 (방금 쓴 것). 살짝 흐리게 보인다
  pending?: boolean;
};

type CommentSectionProps = {
  targetType: CommentTarget;
  targetId: string;
  comments: Comment[];
  // 보고 있는 사람. 방금 쓴 댓글을 서버의 답을 기다리지 않고 먼저 그릴 때 쓴다
  me: Comment["author"];
  // 게시물 주인. 주인은 자기 게시물의 댓글을 모두 지울 수 있다
  ownerId: string;
};

// 게시물 아래의 댓글 — 목록(오래된 것부터) + 화면 맨 아래에 붙어 있는 입력칸. 답글은 없다.
// 쓰기 · 지우기 모두 서버의 답을 기다리지 않고 화면부터 바꾸고, 실패하면 되돌리고 알린다.
// 지우기는 줄을 왼쪽으로 밀어서 (이 프로젝트의 규칙 — 인벤토리 · 아이템 줄과 같다). 내 댓글과, 내 게시물에 달린 댓글만 밀린다.
// 입력칸은 main 의 마지막 자식이어야 화면 맨 아래에 계속 붙어 있는다 (sticky 는 부모 상자 밖으로 못 나간다)
export function CommentSection({ targetType, targetId, comments, me, ownerId }: CommentSectionProps) {
  const [rows, setRows] = useState<Row[]>(comments);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  // 밀어서 휴지통이 나와 있는 줄. 한 번에 한 줄만
  const [swiped, setSwiped] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    const tempId = `pending-${Date.now()}`;
    setRows((current) => [...current, { id: tempId, body, createdAt: new Date().toISOString(), author: me, pending: true }]);
    setText("");
    startTransition(async () => {
      const result = await addComment(targetType, targetId, body);
      if (result.error || !result.id || !result.createdAt) {
        setRows((current) => current.filter((row) => row.id !== tempId));
        setText(body);
        setNotice(result.error ?? "잠시 후 다시 시도해 주세요.");
        return;
      }
      const { id, createdAt } = result;
      setRows((current) => current.map((row) => (row.id === tempId ? { ...row, id, createdAt, pending: false } : row)));
    });
  }

  function remove(comment: Row) {
    setSwiped(null);
    setRows((current) => current.filter((row) => row.id !== comment.id));
    startTransition(async () => {
      const result = await deleteComment(comment.id, targetType, targetId);
      if (!result.error) return;
      // 실패 — 원래 자리(시간순)로 되돌린다
      setRows((current) => [...current, comment].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setNotice(result.error);
    });
  }

  return (
    <>
      <section className="mt-12">
        <h3 className="px-5 text-body font-bold">{rows.length > 0 ? `댓글 ${rows.length}` : "댓글"}</h3>
        {rows.length === 0 ? (
          <p className="mt-3 px-5 text-caption text-ink-muted">첫 댓글을 남겨 보세요.</p>
        ) : (
          <ul className="mt-2">
            {rows.map((comment) => {
              const canDelete = !comment.pending && (comment.author.id === me.id || ownerId === me.id);
              return (
                <li key={comment.id} className={comment.pending ? "opacity-50" : ""}>
                  {canDelete ? (
                    <SwipeRow open={swiped === comment.id ? "delete" : null} onOpenChange={(side) => setSwiped(side ? comment.id : null)} onDelete={() => remove(comment)}>
                      <CommentRow comment={comment} isMe={comment.author.id === me.id} />
                    </SwipeRow>
                  ) : (
                    <CommentRow comment={comment} isMe={false} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 화면 맨 아래에 붙는 입력칸. 아래 여백은 아이폰 홈 막대 영역과 기본 여백 중 큰 쪽 (하단 탭과 같은 규칙) */}
      <form onSubmit={submit} className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-border bg-white px-5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={COMMENT_MAX}
          placeholder="댓글 달기…"
          aria-label="댓글"
          enterKeyHint="send"
          className="h-11 min-w-0 flex-1 rounded-full bg-gray-2 px-4 text-label outline-none placeholder:text-ink-muted"
        />
        <button type="submit" disabled={!text.trim()} className="shrink-0 text-label font-bold text-point active:opacity-60 disabled:text-disabled">
          게시
        </button>
      </form>
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}

// 댓글 한 줄 — 프로필 사진 · 닉네임 · 시각 · 내용. 사진과 닉네임을 누르면 그 사람의 프로필 (나면 내 프로필)
function CommentRow({ comment, isMe }: { comment: Row; isMe: boolean }) {
  const href = isMe ? "/my" : profilePath(comment.author.handle);
  return (
    <div className="flex gap-3 px-5 py-3">
      <Link href={href} className="shrink-0 active:opacity-60">
        <Avatar url={comment.author.avatarUrl} size={36} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-caption">
          <Link href={href} className="font-bold active:opacity-60">
            {comment.author.nickname}
          </Link>{" "}
          {/* 서버와 브라우저의 시계가 조금 달라 "방금"과 "1분 전"이 엇갈릴 수 있어서 경고를 끈다 */}
          <span className="text-ink-muted" suppressHydrationWarning>
            {timeAgo(comment.createdAt)}
          </span>
        </p>
        <p className="whitespace-pre-line break-words text-label">{comment.body}</p>
      </div>
    </div>
  );
}
