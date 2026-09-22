"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 팔로우를 걸거나 푼다. 화면은 서버의 답을 기다리지 않고 먼저 바뀌고(FollowButton), 여기서 실패하면 되돌린다
export async function setFollow(userId: string, following: boolean): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(userId)) return { error: "잘못된 요청입니다." };
  // DB 도 막지만(follows_not_self) 안내 글자를 위해 먼저 본다
  if (userId === profile.id) return { error: "나를 팔로우할 수는 없어요." };

  const supabase = await createClient();
  const { error } = following
    ? await supabase.from("follows").insert({ follower_id: profile.id, following_id: userId })
    : await supabase.from("follows").delete().eq("follower_id", profile.id).eq("following_id", userId);
  // 23505 = 이미 팔로우한 사람을 또 걸었다 (두 번 눌렀거나 다른 기기에서). 그대로 걸린 것이니 괜찮다
  if (error && error.code !== "23505") return { error: "잠시 후 다시 시도해 주세요." };

  // 내 프로필의 팔로잉 수, 목록들
  revalidatePath("/my");
  revalidatePath("/u", "layout");
  return {};
}

// 차단. DB 함수가 차단 행을 넣고 서로의 팔로우를 끊는다. 그 뒤로 서로의 아이템 · 인벤토리가 안 보인다 (DB 규칙)
export async function blockUser(userId: string): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(userId)) return { error: "잘못된 요청입니다." };
  if (userId === profile.id) return { error: "나를 차단할 수는 없어요." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("block_user", { target_id: userId });
  if (error) return { error: "잠시 후 다시 시도해 주세요." };

  revalidatePath("/", "layout");
  return {};
}

// 차단 해제. 끊긴 팔로우는 돌아오지 않는다 — 다시 걸면 된다
export async function unblockUser(userId: string): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(userId)) return { error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", profile.id).eq("blocked_id", userId);
  if (error) return { error: "잠시 후 다시 시도해 주세요." };

  revalidatePath("/", "layout");
  return {};
}
