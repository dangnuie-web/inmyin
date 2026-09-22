import type { UserCard } from "@/lib/follow/queries";
import { createClient } from "@/lib/supabase/server";

// 내가 이 사람을 차단했는지. 그 사람이 나를 차단했는지는 알 수 없고 알 필요도 없다 — 그쪽 것은 DB 규칙이 알아서 숨긴다
export async function hasBlocked(userId: string, targetId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase.from("blocks").select("blocked_id", { count: "exact", head: true }).eq("blocker_id", userId).eq("blocked_id", targetId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

// 내가 차단한 사람들, 최근에 차단한 순 (설정 › 차단한 사용자)
export async function getMyBlockedUsers(userId: string): Promise<UserCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blocks")
    .select("created_at, users!blocks_blocked_id_fkey(id, handle, nickname, avatar_url)")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.users.id, handle: row.users.handle, nickname: row.users.nickname, avatarUrl: row.users.avatar_url }));
}
