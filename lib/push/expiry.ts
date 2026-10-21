import { itemPath } from "@/lib/inventory/paths";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXPIRY_NOTICE_DAYS, expiryMessage, expiryWindow, seoulDate } from "./messages";
import { sendToSubscriptions } from "./send";

// 유통기한 임박 알림 — 하루 한 번 예약 실행(app/api/cron/daily/route.ts)이 부른다.
// 기기마다: 지난번에 살핀 날 다음 범위부터 오늘 + EXPIRY_NOTICE_DAYS 일까지 유통기한이 끝나는 내 아이템을 묶어 한 통.
// 같은 날 두 번 불러도 두 번 안 간다(expiry_sent_on). 같은 물건은 한 번만 — 범위가 이어 붙기만 하고 겹치지 않는다.
// 알릴 게 없어도 살핀 날은 적는다 — 그래야 내일 같은 물건을 또 알리지 않는다

export type ExpiryRunResult = { checked: number; sent: number; skipped: boolean };

const MAX_SUBSCRIPTIONS = 1000;

export async function sendExpiryNotices(now = new Date(), days = EXPIRY_NOTICE_DAYS): Promise<ExpiryRunResult> {
  const admin = createAdminClient();
  if (!admin) return { checked: 0, sent: 0, skipped: true };
  const today = seoulDate(now);

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, expiry_sent_on")
    .contains("kinds", ["expiry"])
    .or(`expiry_sent_on.is.null,expiry_sent_on.lt.${today}`)
    .limit(MAX_SUBSCRIPTIONS);
  // 표가 아직 없으면(운영 DB 적용 전) 여기서 끝
  if (error || !subs) return { checked: 0, sent: 0, skipped: true };

  const plans = subs.flatMap((sub) => {
    const range = expiryWindow(today, sub.expiry_sent_on, days);
    return range ? [{ sub, range }] : [];
  });
  if (plans.length === 0) return { checked: 0, sent: 0, skipped: false };

  // 필요한 사람들의 아이템을 한 번에 — 가장 넓은 범위로 읽고 기기마다 거른다
  const userIds = [...new Set(plans.map((plan) => plan.sub.user_id))];
  const from = plans.reduce((min, plan) => (plan.range.from < min ? plan.range.from : min), plans[0].range.from);
  const to = plans[0].range.to;
  const { data: items, error: itemsError } = await admin
    .from("items")
    .select("id, user_id, name, expires_at")
    .in("user_id", userIds)
    .is("deleted_at", null)
    .gte("expires_at", from)
    .lte("expires_at", to)
    .order("expires_at", { ascending: true });
  if (itemsError) return { checked: 0, sent: 0, skipped: true };

  let sent = 0;
  for (const { sub, range } of plans) {
    const mine = (items ?? [])
      .filter((item) => item.user_id === sub.user_id && item.expires_at && item.expires_at >= range.from && item.expires_at <= range.to)
      .map((item) => ({ id: item.id, name: item.name, expiresAt: item.expires_at as string }));
    const payload = expiryMessage(mine, today, { item: (id) => itemPath(id), list: "/my/items" });
    if (payload) sent += await sendToSubscriptions([sub], payload);
    await admin.from("push_subscriptions").update({ expiry_sent_on: today }).eq("id", sub.id);
  }
  return { checked: plans.length, sent, skipped: false };
}
