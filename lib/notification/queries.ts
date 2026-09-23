import { createClient } from "@/lib/supabase/server";

type Person = { id: string; handle: string; nickname: string; avatarUrl: string | null };
// 하트 · 댓글이 달린 것 — 아이템 또는 INMYIN 게시물
export type NotificationTarget = { kind: "item" | "post"; id: string; name: string; imageUrl: string };

// 알림 한 줄. 누가 무엇을 했는지 종류별로 다르다 — 공지는 사람이 아니라 주인이 쓴 글
export type Notification =
  | { id: string; kind: "follow"; createdAt: string; actor: Person }
  | { id: string; kind: "heart"; createdAt: string; actor: Person; target: NotificationTarget }
  | { id: string; kind: "comment"; createdAt: string; actor: Person; target: NotificationTarget; body: string }
  | { id: string; kind: "announcement"; createdAt: string; title: string; body: string | null; link: string | null };

const NOTIFICATION_LIMIT = 100;
const ANNOUNCEMENT_LIMIT = 20;

// 안 본 알림이 있는가 (종의 빨간 점). DB 함수 has_unread_notifications
export async function hasUnreadNotifications(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("has_unread_notifications");
  if (error) throw error;
  return data === true;
}

// 내 알림과 공지를 섞어 최신순으로. 차단 사이의 것은 DB 규칙이 뺀다.
// 하트 · 댓글 알림은 그 아이템의 썸네일을 같이 보여주므로 아이템을 한 번 더 읽는다 — 그사이 지워진 아이템의 알림은 뺀다
export async function getNotifications(userId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const [notificationsResult, announcementsResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, target_type, target_id, created_at, actor:users!notifications_actor_id_fkey(id, handle, nickname, avatar_url), comment:comments(body)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATION_LIMIT),
    supabase.from("announcements").select("id, title, body, link, created_at").order("created_at", { ascending: false }).limit(ANNOUNCEMENT_LIMIT),
  ]);
  if (notificationsResult.error) throw notificationsResult.error;
  if (announcementsResult.error) throw announcementsResult.error;

  // 하트 · 댓글이 달린 아이템과 게시물의 썸네일. 지워진 것은 안 온다 → 그 알림은 뺀다
  const itemIds = notificationsResult.data.flatMap((row) => (row.target_type === "item" && row.target_id ? [row.target_id] : []));
  const postIds = notificationsResult.data.flatMap((row) => (row.target_type === "post" && row.target_id ? [row.target_id] : []));
  const targets = new Map<string, NotificationTarget>();
  const [itemsResult, postsResult] = await Promise.all([
    itemIds.length > 0 ? supabase.from("items").select("id, name, image_url").in("id", itemIds).is("deleted_at", null) : null,
    postIds.length > 0 ? supabase.from("inmyin_posts").select("id, title, image_url").in("id", postIds).is("deleted_at", null) : null,
  ]);
  if (itemsResult?.error) throw itemsResult.error;
  if (postsResult?.error) throw postsResult.error;
  for (const item of itemsResult?.data ?? []) targets.set(item.id, { kind: "item", id: item.id, name: item.name, imageUrl: item.image_url });
  for (const post of postsResult?.data ?? []) targets.set(post.id, { kind: "post", id: post.id, name: post.title, imageUrl: post.image_url });

  const rows: Notification[] = [];
  for (const row of notificationsResult.data) {
    const actor = { id: row.actor.id, handle: row.actor.handle, nickname: row.actor.nickname, avatarUrl: row.actor.avatar_url };
    if (row.kind === "follow") {
      rows.push({ id: row.id, kind: "follow", createdAt: row.created_at, actor });
      continue;
    }
    const target = row.target_id ? targets.get(row.target_id) : undefined;
    if (!target) continue;
    if (row.kind === "heart") rows.push({ id: row.id, kind: "heart", createdAt: row.created_at, actor, target });
    else if (row.comment) rows.push({ id: row.id, kind: "comment", createdAt: row.created_at, actor, target, body: row.comment.body });
  }
  for (const row of announcementsResult.data) {
    rows.push({ id: row.id, kind: "announcement", createdAt: row.created_at, title: row.title, body: row.body, link: row.link });
  }

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
