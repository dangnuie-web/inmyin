"use server";

import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { cleanKinds, PUSH_KINDS, type PushKind } from "@/lib/push/messages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 설정 › 알림. 이 기기의 푸시 구독(push_subscriptions 한 줄)을 저장 · 지우기 · 종류 고치기.
// 표가 아직 없거나(운영 DB 적용 전) 실패하면 안내 글자만 돌려준다 — 화면은 깨지지 않는다

export type PushSubscriptionInput = { endpoint: string; p256dh: string; auth: string };

const SAVE_FAILED = "알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.";
const UPDATE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";

// 브라우저 회사의 푸시 서버 주소만 받는다 (https, 너무 길지 않게)
function validSubscription(input: PushSubscriptionInput) {
  if (!input || typeof input.endpoint !== "string" || typeof input.p256dh !== "string" || typeof input.auth !== "string") return false;
  if (input.endpoint.length > 1000 || input.p256dh.length > 200 || input.auth.length > 100) return false;
  try {
    return new URL(input.endpoint).protocol === "https:";
  } catch {
    return false;
  }
}

// 켜기. 같은 기기가 다른 계정으로 켜져 있었으면 이 계정으로 넘긴다 — 남의 줄이라 내 열쇠로는 못 고쳐서, 서비스 키로 한다.
// 사람 확인은 위의 requireProfile 이 하고, 줄의 주인은 언제나 지금 로그인한 사람이다
export async function savePushSubscription(input: PushSubscriptionInput): Promise<FormState & { kinds?: PushKind[] }> {
  const profile = await requireProfile();
  if (!validSubscription(input)) return { error: "잘못된 요청입니다." };

  const row = { user_id: profile.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth, kinds: [...PUSH_KINDS], updated_at: new Date().toISOString() };
  const admin = createAdminClient();
  const { error } = admin
    ? await admin.from("push_subscriptions").upsert(row, { onConflict: "endpoint" })
    : await (await createClient()).from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error) return { error: SAVE_FAILED };
  return { kinds: [...PUSH_KINDS] };
}

// 끄기. 내 줄만 지워진다 (RLS)
export async function removePushSubscription(endpoint: string): Promise<FormState> {
  await requireProfile();
  if (typeof endpoint !== "string" || endpoint.length > 1000) return { error: "잘못된 요청입니다." };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { error: UPDATE_FAILED };
  return {};
}

// 받을 종류 고치기
export async function updatePushKinds(endpoint: string, kinds: PushKind[]): Promise<FormState> {
  const profile = await requireProfile();
  if (typeof endpoint !== "string" || endpoint.length > 1000) return { error: "잘못된 요청입니다." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .update({ kinds: cleanKinds(kinds), updated_at: new Date().toISOString() })
    .eq("endpoint", endpoint)
    .eq("user_id", profile.id)
    .select("id");
  if (error || !data || data.length === 0) return { error: UPDATE_FAILED };
  return {};
}

// 이 기기가 내 계정으로 켜져 있는지, 켜져 있으면 받을 종류. 없으면(또는 표가 없으면) null
export async function loadPushKinds(endpoint: string): Promise<PushKind[] | null> {
  const profile = await requireProfile();
  if (typeof endpoint !== "string" || endpoint.length > 1000) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("push_subscriptions").select("kinds").eq("endpoint", endpoint).eq("user_id", profile.id).maybeSingle();
  if (error || !data) return null;
  return cleanKinds(data.kinds);
}
