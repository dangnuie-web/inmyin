import { createClient } from "@/lib/supabase/server";

export type HeartTarget = "item" | "post";

// 내가 이것에 하트를 눌렀는지. 누가 무엇에 눌렀는지는 본인만 볼 수 있어서(RLS) 내 것만 물어볼 수 있다.
// 하트한 것을 모아 보는 화면은 없으므로 조회는 이것뿐이다 — 수는 items.heart_count 에서 읽는다
export async function hasHearted(userId: string, targetType: HeartTarget, targetId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("hearts")
    .select("target_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
