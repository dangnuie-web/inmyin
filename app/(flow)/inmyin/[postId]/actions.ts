"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 게시물 삭제 — deleted_at 기록 (규칙 6). 이미지 파일은 남는다. 내 게시물만 지울 수 있는 것은 DB 규칙이 정한다
export async function deletePost(postId: string): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(postId)) return { error: "잘못된 요청입니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("inmyin_posts").update({ deleted_at: new Date().toISOString() }).eq("id", postId).eq("user_id", profile.id).is("deleted_at", null);
  if (error) return { error: "지우지 못했습니다. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/my");
  revalidatePath("/inmyin");
  return {};
}
