import type { Metadata } from "next";
import { MarkSeen } from "@/components/notification/MarkSeen";
import { NotificationRow } from "@/components/notification/NotificationRow";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getMyFollowingIds } from "@/lib/follow/queries";
import { getNotifications } from "@/lib/notification/queries";

export const metadata: Metadata = { title: "알림 · INMYIN" };

// N-01 · 알림. Home 갈래 줄 오른쪽 끝의 종에서 온다. 팔로우 · 하트 · 댓글과 공지가 최신순으로.
// 마지막으로 본 시각보다 새것은 옅은 바탕. 열면 "여기까지 봤다"고 적어 종의 빨간 점을 끈다 (MarkSeen)
export default async function NotificationsPage() {
  const profile = await requireProfile();
  const [notifications, followingIds] = await Promise.all([getNotifications(profile.id), getMyFollowingIds(profile.id)]);
  // 한 번도 안 열었으면 가입 시각 — 가입 전의 공지는 새것이 아니다 (DB 함수 has_unread_notifications 와 같은 기준)
  const seenAt = new Date(profile.notifications_seen_at ?? profile.created_at).getTime();

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      <MarkSeen />
      <div className="px-5 pt-3">
        <HeaderMini icon="back" href="/" title="알림" />
      </div>
      {notifications.length === 0 ? (
        <p className="mt-16 text-center text-body text-ink-muted">아직 알림이 없어요.</p>
      ) : (
        <ul className="mt-3">
          {notifications.map((notification) => (
            <li key={notification.id}>
              <NotificationRow notification={notification} unread={new Date(notification.createdAt).getTime() > seenAt} followingIds={followingIds} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
