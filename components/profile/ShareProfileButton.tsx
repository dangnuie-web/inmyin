"use client";

import { useCallback, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { profilePath } from "@/lib/profile/paths";

type ShareProfileButtonProps = {
  handle: string;
  nickname: string;
  className?: string;
};

// 프로필 공유. 폰에서는 공유 시트(카톡 · 메시지 · 에어드롭…)를 띄우고, 공유 시트가 없는 컴퓨터에서는 링크를 복사한다.
// 링크는 /u/아이디 — 받은 사람은 로그인해야 볼 수 있다 (로그인 없이 보기는 docs/roadmap.md "나중에 할 일")
export function ShareProfileButton({ handle, nickname, className }: ShareProfileButtonProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  async function share() {
    const url = `${window.location.origin}${profilePath(handle)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${nickname} · INMYIN`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("프로필 링크를 복사했어요.");
    } catch (error) {
      // 공유 시트를 그냥 닫은 것은 오류가 아니다
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice("공유하지 못했어요. 주소창의 링크를 직접 복사해 주세요.");
    }
  }

  return (
    <>
      <button type="button" onClick={share} className={className}>
        프로필 공유
      </button>
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}
