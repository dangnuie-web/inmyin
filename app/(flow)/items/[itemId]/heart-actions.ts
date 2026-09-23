"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import type { HeartTarget } from "@/lib/heart/queries";
import { itemPath } from "@/lib/inventory/paths";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 하트를 켜거나 끈다. 아이템 · INMYIN 게시물 공용 — 하트 수(heart_count)는 DB 트리거가 센다.
// 한 사람이 한 번만 누를 수 있는 것은 DB 의 기본키가 막고, 한도는 없다 (모아 두는 것이 아니라 반응이라서).
// 화면은 서버의 답을 기다리지 않고 먼저 바뀌고(HeartButton), 여기서 실패하면 되돌린다
export async function setHeart(targetType: HeartTarget, targetId: string, hearted: boolean): Promise<FormState> {
  const profile = await requireProfile();
  if ((targetType !== "item" && targetType !== "post") || !UUID_PATTERN.test(targetId)) return { error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const { error } = hearted
    ? await supabase.from("hearts").insert({ user_id: profile.id, target_type: targetType, target_id: targetId })
    : await supabase.from("hearts").delete().eq("user_id", profile.id).eq("target_type", targetType).eq("target_id", targetId);
  // 23505 = 이미 누른 것을 또 켰다 (두 번 눌렀거나 다른 기기에서). 그대로 켜진 것이니 괜찮다
  if (error && error.code !== "23505") return { error: "잠시 후 다시 시도해 주세요." };

  if (targetType === "item") revalidatePath(itemPath(targetId));
  return {};
}
