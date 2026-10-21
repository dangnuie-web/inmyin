import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGoneStatus, type PushKind, type PushPayload } from "./messages";

// 웹 푸시 보내기 — 서버에서만. 받는 사람이 그 종류를 켠 기기마다 한 통씩.
// 무엇이든 실패하면 조용히 넘어간다: 키가 없거나, push_subscriptions 표가 아직 없거나(운영 DB 적용 전), 푸시 서버가 안 받아도
// 하트 · 팔로우 · 댓글 자체는 이미 저장됐고 앱 안 알림도 쌓였다. 푸시는 덤이다.
// 끊긴 구독(404 · 410 — 앱을 지웠거나 권한을 껐다)은 지운다

// 푸시 서버가 들고 있다가 기기가 켜지면 건네는 시간. 하루 지나면 버린다
const TTL_SECONDS = 60 * 60 * 24;

function vapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export type PushTarget = { id: string; endpoint: string; p256dh: string; auth: string };

// 이미 고른 기기들에 보낸다. 보낸 수를 돌려준다 (시험 · 기록용)
export async function sendToSubscriptions(subscriptions: PushTarget[], payload: PushPayload): Promise<number> {
  const keys = vapid();
  const admin = createAdminClient();
  if (!keys || !admin || subscriptions.length === 0) return 0;

  const body = JSON.stringify(payload);
  const gone: string[] = [];
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body, {
        vapidDetails: keys,
        TTL: TTL_SECONDS,
        timeout: 5000,
      }),
    ),
  );
  let sent = 0;
  results.forEach((result, i) => {
    if (result.status === "fulfilled") sent += 1;
    else if (isGoneStatus((result.reason as { statusCode?: number } | null)?.statusCode)) gone.push(subscriptions[i].id);
  });
  if (gone.length > 0) await admin.from("push_subscriptions").delete().in("id", gone);
  return sent;
}

// 한 사람에게. 그 종류를 켠 기기만
export async function pushToUser(userId: string, kind: PushKind, payload: PushPayload): Promise<number> {
  try {
    const admin = createAdminClient();
    if (!admin || !vapid()) return 0;
    const { data, error } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId).contains("kinds", [kind]);
    if (error || !data) return 0;
    return await sendToSubscriptions(data, payload);
  } catch {
    return 0;
  }
}
