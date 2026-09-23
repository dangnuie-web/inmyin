"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import type { CommentTarget } from "@/lib/comment/queries";
import { COMMENT_MAX } from "@/lib/comment/rules";
import { postPath } from "@/lib/inmyin/paths";
import { itemPath } from "@/lib/inventory/paths";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 댓글 달기. 아이템 · INMYIN 게시물 공용 — 댓글 수(comment_count)는 DB 트리거가 센다.
// 화면은 서버의 답을 기다리지 않고 먼저 붙여 두고(CommentSection), 여기서 진짜 id 와 시각을 돌려받아 바꿔 끼운다
export async function addComment(targetType: CommentTarget, targetId: string, body: string): Promise<FormState & { id?: string; createdAt?: string }> {
  const profile = await requireProfile();
  if ((targetType !== "item" && targetType !== "post") || !UUID_PATTERN.test(targetId)) return { error: "잘못된 요청입니다." };
  const text = body.trim();
  if (!text) return { error: "댓글을 입력해 주세요." };
  if (text.length > COMMENT_MAX) return { error: `댓글은 ${COMMENT_MAX}자까지 쓸 수 있어요.` };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ user_id: profile.id, target_type: targetType, target_id: targetId, body: text })
    .select("id, created_at")
    .single();
  if (error) return { error: "잠시 후 다시 시도해 주세요." };

  revalidatePath(targetType === "item" ? itemPath(targetId) : postPath(targetId));
  return { id: data.id, createdAt: data.created_at };
}

// 댓글 지우기 — deleted_at 기록. 쓴 사람과 게시물 주인만 지울 수 있는 것은 DB 규칙이 정한다 (남의 것을 지우려 하면 0줄이 바뀐다)
export async function deleteComment(commentId: string, targetType: CommentTarget, targetId: string): Promise<FormState> {
  await requireProfile();
  if (!UUID_PATTERN.test(commentId) || !UUID_PATTERN.test(targetId)) return { error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId).is("deleted_at", null);
  if (error) return { error: "잠시 후 다시 시도해 주세요." };

  revalidatePath(targetType === "item" ? itemPath(targetId) : postPath(targetId));
  return {};
}
