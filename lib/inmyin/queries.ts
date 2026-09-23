import { createClient } from "@/lib/supabase/server";
import type { PostSort } from "./paths";

// 목록(H-03)의 카드 하나
export type FeedPost = {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
  author: { handle: string; nickname: string; avatarUrl: string | null };
};

const FEED_LIMIT = 60;

// 모든 사람의 INMYIN 게시물. 카테고리는 게시물에 든 아이템의 태그로 거른다 (게시물 자체엔 태그가 없다).
// 인기순은 지금은 북마크 수(캐시) 순 — 최근 24시간으로 세는 것은 순위 집계(lib/ranking.ts)를 만들 때.
// 지워진 게시물 · 차단 사이의 게시물은 DB 규칙이 뺀다
export async function getPostFeed({ category, sort }: { category?: string | null; sort?: PostSort } = {}): Promise<FeedPost[]> {
  const supabase = await createClient();
  let query = supabase.from("inmyin_posts").select("id, title, image_url, created_at, users!inner(handle, nickname, avatar_url)").is("deleted_at", null).limit(FEED_LIMIT);

  // 카테고리: 그 태그의 아이템이 든 게시물의 id 를 먼저 모은다 (안 보이는 아이템은 DB 규칙이 뺀다)
  if (category) {
    const { data: tagged, error: taggedError } = await supabase.from("post_items").select("post_id, items!inner(category)").eq("items.category", category);
    if (taggedError) throw taggedError;
    const ids = Array.from(new Set(tagged.map((row) => row.post_id)));
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  query = sort === "popular" ? query.order("bookmark_count", { ascending: false }).order("created_at", { ascending: false }) : query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data.map((post) => ({
    id: post.id,
    title: post.title,
    imageUrl: post.image_url,
    createdAt: post.created_at,
    author: { handle: post.users.handle, nickname: post.users.nickname, avatarUrl: post.users.avatar_url },
  }));
}

// 상세(H-04)의 이미지 위 라벨 = 탭 영역. 아이템이 지워졌거나 안 보이면(DB 규칙) 빠진다 — 이미지는 그대로, 누를 곳만 없다
export type PostHotspot = { itemId: string; name: string; description: string | null; x: number; y: number; w: number; h: number };

export type PostDetail = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  createdAt: string;
  heartCount: number;
  commentCount: number;
  author: { id: string; handle: string; nickname: string; avatarUrl: string | null };
  hotspots: PostHotspot[];
};

export async function getPostDetail(postId: string): Promise<PostDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inmyin_posts")
    .select("id, title, description, image_url, created_at, heart_count, comment_count, users!inner(id, handle, nickname, avatar_url), post_items(x, y, w, h, items(id, name, description))")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    imageUrl: data.image_url,
    createdAt: data.created_at,
    heartCount: data.heart_count,
    commentCount: data.comment_count,
    author: { id: data.users.id, handle: data.users.handle, nickname: data.users.nickname, avatarUrl: data.users.avatar_url },
    hotspots: data.post_items.flatMap((area) => (area.items ? [{ itemId: area.items.id, name: area.items.name, description: area.items.description, x: area.x, y: area.y, w: area.w, h: area.h }] : [])),
  };
}
