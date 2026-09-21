"use client";

import { useEffect } from "react";

const VISIBLE_MS = 2500;

// 화면 아래에 잠깐 떴다 사라지는 한 줄 안내. message 가 없으면 아무것도 그리지 않는다.
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <p
      role="status"
      className="fixed inset-x-0 bottom-24 z-30 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-dropdown px-5 py-2.5 text-label text-white"
    >
      {message}
    </p>
  );
}
