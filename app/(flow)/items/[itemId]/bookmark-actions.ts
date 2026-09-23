"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import type { BookmarkTarget } from "@/lib/bookmark/queries";
import { postPath } from "@/lib/inmyin/paths";
import { itemPath } from "@/lib/inventory/paths";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 북마크를 켜거나 끈다. 아이템 · INMYIN 게시물 공용 — 순위용 북마크 수(bookmark_count)는 DB 트리거가 센다.
// 화면은 서버의 답을 기다리지 않고 먼저 바뀌고(BookmarkButton), 여기서 실패하면 되돌린다
export async function setBookmark(targetType: BookmarkTarget, targetId: string, bookmarked: boolean): Promise<FormState> {
  const profile = await requireProfile();
  if ((targetType !== "item" && targetType !== "post") || !UUID_PATTERN.test(targetId)) return { error: "잘못된 요청입니다." };

  const supabase = await createClient();

  // 플랜 한도. 화면은 서버의 답을 기다리지 않고 먼저 켜지므로, 넘치면 여기서 돌려보내고 화면이 되돌린다
  if (bookmarked) {
    const { maxBookmarks } = planLimits(profile.plan);
    const { count, error: countError } = await supabase.from("bookmarks").select("target_id", { count: "exact", head: true }).eq("user_id", profile.id);
    if (countError) return { error: "잠시 후 다시 시도해 주세요." };
    if ((count ?? 0) >= maxBookmarks) return { error: `북마크는 ${maxBookmarks.toLocaleString("ko-KR")}개까지 모을 수 있어요.` };
  }

  const { error } = bookmarked
    ? await supabase.from("bookmarks").insert({ user_id: profile.id, target_type: targetType, target_id: targetId })
    : await supabase.from("bookmarks").delete().eq("user_id", profile.id).eq("target_type", targetType).eq("target_id", targetId);
  // 23505 = 이미 북마크한 것을 또 켰다 (두 번 눌렀거나 다른 기기에서). 그대로 켜진 것이니 괜찮다
  if (error && error.code !== "23505") return { error: "잠시 후 다시 시도해 주세요." };

  revalidatePath(targetType === "item" ? itemPath(targetId) : postPath(targetId));
  return {};
}
