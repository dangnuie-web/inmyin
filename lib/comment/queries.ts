import { createClient } from "@/lib/supabase/server";

export type CommentTarget = "item" | "post";

export type Comment = {
  id: string;
  body: string;
  // "2026-09-23T…"
  createdAt: string;
  author: { id: string; handle: string; nickname: string; avatarUrl: string | null };
};

// 한 게시물의 댓글 전부, 오래된 것부터 (대화 순서). 지워진 것 · 차단 사이의 것은 DB 규칙이 뺀다.
// 답글이 없어서 한 줄로 늘어선다
export async function getComments(targetType: CommentTarget, targetId: string): Promise<Comment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at, users!inner(id, handle, nickname, avatar_url)")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at");
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author: { id: row.users.id, handle: row.users.handle, nickname: row.users.nickname, avatarUrl: row.users.avatar_url },
  }));
}
