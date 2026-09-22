"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { followsPath, type FollowTab } from "@/lib/profile/paths";
import { FollowListsModal } from "./FollowListsModal";

type FollowCountsProps = {
  handle: string;
  followerCount: number;
  followingCount: number;
};

// 프로필의 "팔로워 n · 팔로잉 n". 누르면 폰에서는 목록 화면(M-12)으로 가고, 웹(1024px 이상)에서는 모달(M-12a)이 뜬다
export function FollowCounts({ handle, followerCount, followingCount }: FollowCountsProps) {
  const [modalTab, setModalTab] = useState<FollowTab | null>(null);

  function open(event: MouseEvent, tab: FollowTab) {
    if (!window.matchMedia("(min-width: 64rem)").matches) return;
    event.preventDefault();
    setModalTab(tab);
  }

  return (
    <>
      <p className="flex gap-2.5 text-label">
        <Link href={followsPath(handle, "followers")} onClick={(event) => open(event, "followers")} className="active:opacity-60">
          팔로워 {followerCount.toLocaleString("ko-KR")}
        </Link>
        <Link href={followsPath(handle, "following")} onClick={(event) => open(event, "following")} className="active:opacity-60">
          팔로잉 {followingCount.toLocaleString("ko-KR")}
        </Link>
      </p>
      {modalTab && <FollowListsModal handle={handle} initialTab={modalTab} onClose={() => setModalTab(null)} />}
    </>
  );
}
