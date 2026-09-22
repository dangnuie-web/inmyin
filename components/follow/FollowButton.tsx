"use client";

import { useCallback, useState, useTransition } from "react";
import { setFollow } from "@/app/(flow)/u/actions";
import { Toast } from "@/components/ui/Toast";

type FollowButtonProps = {
  userId: string;
  // 들어올 때의 상태. 그 뒤로는 이 부품이 스스로 들고 있는다
  following: boolean;
  // 목록의 줄에서는 작게
  size?: "md" | "sm";
};

const SIZES = { md: "h-8 px-3.5 text-label", sm: "h-7 px-3 text-caption" };

// 팔로우 / 팔로잉 버튼 (H-02 작성자 줄, M-12 목록, H-06). 누르면 화면부터 바뀌고 서버에 저장한다 — 실패하면 되돌리고 알린다.
// 아직 안 걸었으면 검정 "팔로우", 걸었으면 흰 바탕 테두리 "팔로잉" — 누르면 푼다
export function FollowButton({ userId, following: initial, size = "md" }: FollowButtonProps) {
  const [following, setFollowing] = useState(initial);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const result = await setFollow(userId, next);
      if (!result.error) return;
      setFollowing(!next);
      setNotice(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={following}
        className={`shrink-0 rounded-sm font-bold active:opacity-80 ${SIZES[size]} ${following ? "border border-disabled bg-white text-ink" : "bg-ink text-white"}`}
      >
        {following ? "팔로잉" : "팔로우"}
      </button>
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}
