"use client";

import { useEffect } from "react";

const VISIBLE_MS = 2500;
// 버튼이 달린 안내는 읽고 누를 시간이 필요하다
const VISIBLE_WITH_ACTION_MS = 5000;

type ToastProps = {
  message: string | null;
  onDone: () => void;
  // 안내 옆에 붙는 버튼. 예: 삭제 뒤의 "되돌리기"
  action?: { label: string; onClick: () => void };
};

// 화면 아래에 잠깐 떴다 사라지는 한 줄 안내. message 가 없으면 아무것도 그리지 않는다.
export function Toast({ message, onDone, action }: ToastProps) {
  const visibleMs = action ? VISIBLE_WITH_ACTION_MS : VISIBLE_MS;
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, visibleMs);
    return () => clearTimeout(timer);
  }, [message, onDone, visibleMs]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-24 z-30 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-4 rounded-full bg-dropdown px-5 py-2.5 text-label text-white"
    >
      <p>{message}</p>
      {action && (
        <button type="button" onClick={action.onClick} className="font-bold underline underline-offset-4 active:opacity-60">
          {action.label}
        </button>
      )}
    </div>
  );
}
