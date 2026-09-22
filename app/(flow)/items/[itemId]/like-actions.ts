"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { itemPath } from "@/lib/inventory/paths";
import type { LikeTarget } from "@/lib/like/queries";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 좋아요를 켜거나 끈다. 아이템 · INMYIN 게시물 공용 — 좋아요 수(like_count)는 DB 트리거가 센다.
// 화면은 서버의 답을 기다리지 않고 먼저 바뀌고(LikeButton), 여기서 실패하면 되돌린다
export async function setLike(targetType: LikeTarget, targetId: string, liked: boolean): Promise<FormState> {
  const profile = await requireProfile();
  if ((targetType !== "item" && targetType !== "post") || !UUID_PATTERN.test(targetId)) return { error: "잘못된 요청입니다." };

  const supabase = await createClient();

  // 플랜 한도. 화면은 서버의 답을 기다리지 않고 먼저 켜지므로, 넘치면 여기서 돌려보내고 화면이 되돌린다
  if (liked) {
    const { maxLikes } = planLimits(profile.plan);
    const { count, error: countError } = await supabase.from("likes").select("target_id", { count: "exact", head: true }).eq("user_id", profile.id);
    if (countError) return { error: "잠시 후 다시 시도해 주세요." };
    if ((count ?? 0) >= maxLikes) return { error: `좋아요는 ${maxLikes.toLocaleString("ko-KR")}개까지 모을 수 있어요.` };
  }

  const { error } = liked
    ? await supabase.from("likes").insert({ user_id: profile.id, target_type: targetType, target_id: targetId })
    : await supabase.from("likes").delete().eq("user_id", profile.id).eq("target_type", targetType).eq("target_id", targetId);
  // 23505 = 이미 좋아한 것을 또 켰다 (두 번 눌렀거나 다른 기기에서). 그대로 켜진 것이니 괜찮다
  if (error && error.code !== "23505") return { error: "잠시 후 다시 시도해 주세요." };

  if (targetType === "item") revalidatePath(itemPath(targetId));
  return {};
}
