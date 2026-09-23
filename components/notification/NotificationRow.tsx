import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FollowButton } from "@/components/follow/FollowButton";
import { Avatar } from "@/components/profile/Avatar";
import { Icon } from "@/components/ui/Icon";
import { itemPath } from "@/lib/inventory/paths";
import type { Notification } from "@/lib/notification/queries";
import { profilePath } from "@/lib/profile/paths";
import { timeAgo } from "@/lib/time";

// 댓글 알림에 보여줄 댓글 글자 수. 넘치면 …
const COMMENT_PREVIEW = 40;

type NotificationRowProps = {
  notification: Notification;
  // 마지막으로 본 시각보다 새것이면 옅은 바탕
  unread: boolean;
  // 팔로우 알림의 오른쪽 버튼이 "팔로우"인지 "팔로잉"인지
  followingIds: Set<string>;
};

// 알림 한 줄 — 왼쪽 동그라미(프로필 사진 · 공지는 종) · 가운데 글 · 시각 · 오른쪽에 아이템 썸네일이나 팔로우 버튼.
// 줄 전체를 누르면 그 아이템 · 그 사람 · 공지의 링크로 간다
export function NotificationRow({ notification, unread, followingIds }: NotificationRowProps) {
  const time = (
    <span className="text-ink-muted" suppressHydrationWarning>
      {timeAgo(notification.createdAt)}
    </span>
  );

  if (notification.kind === "announcement") {
    return (
      <Shell href={notification.link ?? undefined} unread={unread} lead={<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink text-white"><Icon name="bell" /></span>}>
        <p className="text-caption">
          <span className="font-bold">공지</span> {time}
        </p>
        <p className="text-label font-bold">{notification.title}</p>
        {notification.body && <p className="whitespace-pre-line break-words text-label">{notification.body}</p>}
      </Shell>
    );
  }

  const { actor } = notification;
  const who = <span className="font-bold">{actor.nickname}</span>;

  if (notification.kind === "follow") {
    return (
      <Shell href={profilePath(actor.handle)} unread={unread} lead={<Avatar url={actor.avatarUrl} size={36} />} trailing={<FollowButton userId={actor.id} following={followingIds.has(actor.id)} size="sm" />}>
        <p className="text-label">{who}님이 회원님을 팔로우하기 시작했어요</p>
        <p className="text-caption">{time}</p>
      </Shell>
    );
  }

  const href = itemPath(notification.item.id);
  const thumb = (
    <Link href={href} className="relative size-11 shrink-0 overflow-hidden rounded-md bg-gray-1 active:opacity-60">
      <Image src={notification.item.imageUrl} alt={notification.item.name} fill sizes="44px" unoptimized className="object-cover" />
    </Link>
  );
  const preview = notification.kind === "comment" ? (notification.body.length > COMMENT_PREVIEW ? `${notification.body.slice(0, COMMENT_PREVIEW)}…` : notification.body) : null;

  return (
    <Shell href={href} unread={unread} lead={<Avatar url={actor.avatarUrl} size={36} />} trailing={thumb}>
      <p className="text-label">
        {who}님이 {notification.kind === "heart" ? "회원님의 아이템에 하트를 눌렀어요" : <>댓글을 남겼어요: {preview}</>}
      </p>
      <p className="text-caption">{time}</p>
    </Shell>
  );
}

// 줄의 틀. 왼쪽 동그라미와 가운데 글이 링크이고, 오른쪽(팔로우 버튼 · 썸네일)은 링크 밖에 있다 —
// 버튼이 링크 안에 들어가면 버튼을 눌러도 링크로 가 버린다
function Shell({ href, unread, lead, trailing, children }: { href?: string; unread: boolean; lead: ReactNode; trailing?: ReactNode; children: ReactNode }) {
  const bodyClass = "flex min-w-0 flex-1 items-center gap-3";
  const inner = (
    <>
      {lead}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 break-keep">{children}</span>
    </>
  );
  return (
    <div className={`flex items-center gap-3 px-5 py-3 ${unread ? "bg-surface" : ""}`}>
      {href ? (
        <Link href={href} className={`${bodyClass} active:opacity-60`}>
          {inner}
        </Link>
      ) : (
        <div className={bodyClass}>{inner}</div>
      )}
      {trailing}
    </div>
  );
}
