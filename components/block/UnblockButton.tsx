"use client";

import { useCallback, useState, useTransition } from "react";
import { unblockUser } from "@/app/(flow)/u/actions";
import { Toast } from "@/components/ui/Toast";

// 설정 › 차단한 사용자의 줄에서 해제. 누르면 줄이 바로 "해제됨"으로 바뀐다
export function UnblockButton({ userId }: { userId: string }) {
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  function unblock() {
    startTransition(async () => {
      const result = await unblockUser(userId);
      if (result.error) return setNotice(result.error);
      setDone(true);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={unblock}
        disabled={done || pending}
        className="h-7 shrink-0 rounded-sm border border-disabled bg-white px-3 text-caption font-bold text-ink active:opacity-80 disabled:text-disabled"
      >
        {done ? "해제됨" : "차단 해제"}
      </button>
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}
