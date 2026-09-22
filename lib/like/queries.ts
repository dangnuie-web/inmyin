import { createClient } from "@/lib/supabase/server";

export type LikeTarget = "item" | "post";

// 내가 이것을 좋아했는지. 누가 무엇을 좋아했는지는 본인만 볼 수 있어서(RLS) 내 것만 물어볼 수 있다
export async function hasLiked(userId: string, targetType: LikeTarget, targetId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("likes")
    .select("target_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
