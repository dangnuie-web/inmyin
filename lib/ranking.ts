import { createClient } from "@/lib/supabase/server";

// 인기 · 추천 순위 (발견 탭 H-05, INMYIN 목록의 인기순). 세는 것은 DB 함수(discover_users · popular_posts)가 하고, 문턱은 여기서 준다.
// 추천 = 누적 북마크가 이 수 미만인 사람 (아직 덜 알려진 사람을 띄운다)
export const RECOMMEND_THRESHOLD = 100;
const DISCOVER_LIMIT = 30;
const POSTS_PER_USER = 3;

export type DiscoverMode = "recommend" | "popular";

export type DiscoverUser = {
  id: string;
  handle: string;
  nickname: string;
  avatarUrl: string | null;
  // 최근에 올린 날 ("2026-09-24T…")
  latestPostAt: string;
  // 최근 게시물 세 개
  posts: { id: string; imageUrl: string }[];
};

// 발견 탭의 사람들 — 인기(최근 24시간 북마크) 또는 추천(누적 북마크 문턱 미만 중 최근 1시간). 나와 차단 사이는 DB 함수가 뺀다
export async function getDiscoverUsers(mode: DiscoverMode): Promise<DiscoverUser[]> {
  const supabase = await createClient();
  const { data: ranked, error } = await supabase.rpc("discover_users", { p_mode: mode, p_threshold: RECOMMEND_THRESHOLD, p_limit: DISCOVER_LIMIT });
  if (error) throw error;
  if (ranked.length === 0) return [];

  const ids = ranked.map((row) => row.user_id);
  const [usersResult, postsResult] = await Promise.all([
    supabase.from("users").select("id, handle, nickname, avatar_url").in("id", ids),
    supabase.from("inmyin_posts").select("id, user_id, image_url").in("user_id", ids).is("deleted_at", null).order("created_at", { ascending: false }),
  ]);
  if (usersResult.error) throw usersResult.error;
  if (postsResult.error) throw postsResult.error;

  const users = new Map(usersResult.data.map((user) => [user.id, user]));
  const posts = new Map<string, { id: string; imageUrl: string }[]>();
  for (const post of postsResult.data) {
    const list = posts.get(post.user_id) ?? [];
    if (list.length < POSTS_PER_USER) list.push({ id: post.id, imageUrl: post.image_url });
    posts.set(post.user_id, list);
  }

  // DB 함수가 정한 순서대로
  return ranked.flatMap((row) => {
    const user = users.get(row.user_id);
    return user ? [{ id: user.id, handle: user.handle, nickname: user.nickname, avatarUrl: user.avatar_url, latestPostAt: row.latest_post_at, posts: posts.get(user.id) ?? [] }] : [];
  });
}

// INMYIN 목록(H-03)의 인기순 — 최근 24시간 북마크 순의 게시물 id
export async function getPopularPostIds(limit: number): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("popular_posts", { p_limit: limit });
  if (error) throw error;
  return data.map((row) => row.post_id);
}
