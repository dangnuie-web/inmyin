import { after } from "next/server";
import { postPath } from "@/lib/inmyin/paths";
import { itemPath } from "@/lib/inventory/paths";
import { profilePath } from "@/lib/profile/paths";
import { createAdminClient } from "@/lib/supabase/admin";
import { commentMessage, followMessage, heartMessage, type PushKind, type PushPayload } from "./messages";
import { pushToUser } from "./send";

// 팔로우 · 하트 · 댓글이 저장된 직후 서버 함수(app/(flow)/u/actions.ts · items/[itemId]/heart-actions.ts · comment-actions.ts)가 부른다.
// 앱 안 알림(notifications 표)은 DB 트리거가 따로 만든다 — 여기는 그 옆에서 폰을 울리는 것만.
// 응답을 먼저 돌려보내고 뒤에서 보낸다(after) — 누른 사람의 화면이 푸시 때문에 느려지지 않게.
// 안 보내는 것: 내 것에 내가 한 것, 차단 사이(어느 쪽이 걸었든). 트리거 · 알림 화면 규칙과 같다

type Actor = { id: string; handle: string; nickname: string };
type Target = { kind: "item" | "post"; id: string };

async function ownerOf(target: Target): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } =
    target.kind === "item"
      ? await admin.from("items").select("user_id").eq("id", target.id).maybeSingle()
      : await admin.from("inmyin_posts").select("user_id").eq("id", target.id).maybeSingle();
  return data?.user_id ?? null;
}

async function blockedBetween(a: string, b: string): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return true;
  const { count, error } = await admin
    .from("blocks")
    .select("blocker_id", { count: "exact", head: true })
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`);
  // 확인을 못 하면 안 보낸다
  if (error) return true;
  return (count ?? 0) > 0;
}

function sendLater(findRecipient: () => string | null | Promise<string | null>, actorId: string, kind: PushKind, payload: PushPayload) {
  after(async () => {
    try {
      const recipient = await findRecipient();
      if (!recipient || recipient === actorId) return;
      if (await blockedBetween(actorId, recipient)) return;
      await pushToUser(recipient, kind, payload);
    } catch {
      // 푸시는 덤이다 — 실패해도 조용히
    }
  });
}

export function pushFollow(actor: Actor, followingId: string) {
  sendLater(() => followingId, actor.id, "follow", followMessage(actor, profilePath(actor.handle)));
}

export function pushHeart(actor: Actor, target: Target) {
  const url = target.kind === "item" ? itemPath(target.id) : postPath(target.id);
  sendLater(() => ownerOf(target), actor.id, "heart", heartMessage(actor, target, url));
}

export function pushComment(actor: Actor, target: Target, commentId: string, body: string) {
  const url = target.kind === "item" ? itemPath(target.id) : postPath(target.id);
  sendLater(() => ownerOf(target), actor.id, "comment", commentMessage(actor, target, body, commentId, url));
}
