"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadFollowLists } from "@/app/(flow)/u/actions";
import { Avatar } from "@/components/profile/Avatar";
import { Icon } from "@/components/ui/Icon";
import type { UserCard } from "@/lib/follow/queries";
import { profilePath, type FollowTab } from "@/lib/profile/paths";
import { FollowButton } from "./FollowButton";

type Lists = NonNullable<Awaited<ReturnType<typeof loadFollowLists>>>;

// M-12a · 팔로워 · 팔로잉 모달 (웹). 피그마: 가운데 작은 창 — × · 아이디 · 두 갈래(숫자 위, 이름 아래) · 줄마다 팔로우 버튼.
// 내용은 열릴 때 서버에서 받아온다 (화면 M-12 와 같은 조회)
export function FollowListsModal({ handle, initialTab, onClose }: { handle: string; initialTab: FollowTab; onClose: () => void }) {
  const [tab, setTab] = useState<FollowTab>(initialTab);
  const [lists, setLists] = useState<Lists | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadFollowLists(handle).then((result) => alive && setLists(result));
    return () => {
      alive = false;
    };
  }, [handle]);

  // Esc 로 닫기
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const people = lists ? (tab === "followers" ? lists.followers : lists.following) : [];
  const tabs: { tab: FollowTab; label: string; count: number }[] = [
    { tab: "followers", label: "팔로워", count: lists?.followers.length ?? 0 },
    { tab: "following", label: "팔로잉", count: lists?.following.length ?? 0 },
  ];

  return (
    <>
      <button type="button" aria-label="닫기" onClick={onClose} className="fixed inset-0 z-40 cursor-default bg-ink/40" />
      <div role="dialog" aria-label="팔로워 · 팔로잉" className="fixed top-1/2 left-1/2 z-50 flex h-[34.5rem] w-72 -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-white">
        <div className="relative flex h-12 items-center justify-center">
          <button type="button" onClick={onClose} aria-label="닫기" className="absolute left-0 top-0 flex size-12 items-center justify-center active:opacity-60">
            <Icon name="close" scale={0.5} />
          </button>
          <span className="text-label font-bold">{lists?.user.handle ?? handle}</span>
        </div>

        <div className="flex border-b border-border">
          {tabs.map((entry) => (
            <button
              key={entry.tab}
              type="button"
              onClick={() => setTab(entry.tab)}
              aria-pressed={entry.tab === tab}
              className={`-mb-px flex flex-1 flex-col items-center gap-0.5 border-b-2 pt-1 pb-2 ${entry.tab === tab ? "border-ink text-ink" : "border-transparent text-ink-muted"}`}
            >
              <span className="text-body">{entry.count.toLocaleString("ko-KR")}</span>
              <span className="text-caption">{entry.label}</span>
            </button>
          ))}
        </div>

        <ul className="flex flex-1 flex-col overflow-y-auto">
          {lists === undefined ? (
            <li className="p-6 text-center text-caption text-ink-muted">불러오는 중…</li>
          ) : lists === null ? (
            <li className="p-6 text-center text-caption text-ink-muted">사람을 찾을 수 없어요.</li>
          ) : people.length === 0 ? (
            <li className="p-6 text-center text-caption text-ink-muted">{tab === "followers" ? "아직 팔로워가 없어요." : "아직 팔로우한 사람이 없어요."}</li>
          ) : (
            people.map((person) => <Row key={person.id} person={person} isMe={person.id === lists.myId} following={lists.myFollowingIds.includes(person.id)} onClose={onClose} />)
          )}
        </ul>
      </div>
    </>
  );
}

function Row({ person, isMe, following, onClose }: { person: UserCard; isMe: boolean; following: boolean; onClose: () => void }) {
  return (
    <li className="flex h-15 items-center gap-3 px-4">
      <Link href={isMe ? "/my" : profilePath(person.handle)} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-60">
        <Avatar url={person.avatarUrl} size={44} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-caption text-ink-muted">@{person.handle}</span>
          <span className="truncate text-label font-bold">{person.nickname}</span>
        </span>
      </Link>
      {!isMe && <FollowButton userId={person.id} following={following} size="sm" />}
    </li>
  );
}
