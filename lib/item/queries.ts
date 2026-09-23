import type { SlotEntry } from "@/lib/inventory/queries";
import { FEED_PAGE_SIZE, type FeedFilter, type FeedItem } from "./feed";
import { createClient } from "@/lib/supabase/server";

export type ItemDetail = {
  id: string;
  // 지금 들어 있는 인벤토리. 짐싸기로 옮기면 바뀐다
  inventoryId: string;
  name: string;
  description: string | null;
  imageUrl: string;
  category: string | null;
  quantity: number;
  // "20살 생일" 같은 말이나 "26.09.22" 같은 날짜 글자
  acquiredNote: string | null;
  // "2026-09-22" 꼴
  expiresAt: string | null;
  isPublic: boolean;
};

// 내 아이템 하나 (M-14). 없거나 지워졌거나 남의 것이면 null.
// 남의 공개 아이템을 보는 것은 2단계(타유저 프로필)에서 더한다
export async function getMyItemDetail(userId: string, itemId: string): Promise<ItemDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, inventory_id, name, description, image_url, category, quantity, acquired_note, expires_at, is_public")
    .eq("id", itemId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    inventoryId: data.inventory_id,
    name: data.name,
    description: data.description,
    imageUrl: data.image_url,
    category: data.category,
    quantity: data.quantity,
    acquiredNote: data.acquired_note,
    expiresAt: data.expires_at,
    isPublic: data.is_public,
  };
}

// 아이템 모아보기(M-13)의 한 칸. 어느 인벤토리에 있는지도 같이 가진다
export type CollectedItem = {
  id: string;
  name: string;
  imageUrl: string;
  quantity: number;
  category: string | null;
  inventoryName: string;
  // 누구 것인지. 여러 사람의 것이 섞이는 곳(Bookmark 탭)에서만 채운다 — 리스트의 줄에 "닉네임 · 인벤토리"로 보인다
  ownerNickname?: string;
};

// 내 아이템 전부, 최신순 (M-13). 한 번에 다 읽는다 — 검색과 카테고리를 누르는 즉시 걸러 보여주려면 브라우저가 전부 갖고 있어야 한다
export async function getMyItemCollection(userId: string): Promise<CollectedItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, name, image_url, quantity, category, inventories!inner(name)")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    imageUrl: item.image_url,
    quantity: item.quantity,
    category: item.category,
    inventoryName: item.inventories.name,
  }));
}

// ---- 남의 것도 읽는 조회 (2단계). 누가 무엇을 볼 수 있는지는 DB 규칙(RLS)이 정한다 —
// 비공개 아이템, 비공개 인벤토리 안의 것은 애초에 돌아오지 않는다 (docs/data-model.md "비공개 아이템 · 인벤토리 읽기") ----

// 모든 사람의 공개 아이템, 최신순 (H-01). 남의 것이 계속 늘어나므로 한 장씩 읽고, 검색 · 카테고리도 서버가 거른다
export async function getPublicItemFeed({ q, category, before, limit = FEED_PAGE_SIZE }: FeedFilter & { limit?: number } = {}): Promise<FeedItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("items")
    .select("id, name, image_url, quantity, category, created_at, inventories!inner(name), users!inner(handle, nickname)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  // 태그가 없는 아이템은 전체에서만 보인다 (CLAUDE.md 규칙 4)
  if (category) query = query.eq("category", category);
  // %, _ 는 ilike 의 특수문자라 글자 그대로 찾게 앞에 \ 를 붙인다
  if (q?.trim()) query = query.ilike("name", `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    imageUrl: item.image_url,
    quantity: item.quantity,
    category: item.category,
    createdAt: item.created_at,
    inventoryName: item.inventories.name,
    ownerHandle: item.users.handle,
    ownerNickname: item.users.nickname,
  }));
}

// 공개 아이템에서 많이 쓰인 태그 순 (H-01 의 칩). DB 함수 popular_item_categories
export async function getPopularCategories(limit = 12): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("popular_item_categories", { max_count: limit });
  if (error) throw error;
  return data.map((row) => row.category);
}

// 아이템 하나와 주인. 내 것이든 남의 공개 것이든 (M-14 · H-02). 없거나 못 보는 것이면 null
export type AnyItemDetail = ItemDetail & {
  // "2026-09-22T…". 작성자 줄의 날짜이자, 피드에서 이 아이템 근처의 것을 찾는 기준
  createdAt: string;
  // 하트 수 · 댓글 수. 트리거가 세는 캐시 (북마크 수는 순위용이라 화면에 안 보이므로 읽지 않는다)
  heartCount: number;
  commentCount: number;
  owner: { id: string; handle: string; nickname: string; avatarUrl: string | null };
};

export async function getItemDetail(itemId: string): Promise<AnyItemDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, inventory_id, name, description, image_url, category, quantity, acquired_note, expires_at, is_public, created_at, heart_count, comment_count, users!inner(id, handle, nickname, avatar_url)")
    .eq("id", itemId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    inventoryId: data.inventory_id,
    name: data.name,
    description: data.description,
    imageUrl: data.image_url,
    category: data.category,
    quantity: data.quantity,
    acquiredNote: data.acquired_note,
    expiresAt: data.expires_at,
    isPublic: data.is_public,
    createdAt: data.created_at,
    heartCount: data.heart_count,
    commentCount: data.comment_count,
    owner: { id: data.users.id, handle: data.users.handle, nickname: data.users.nickname, avatarUrl: data.users.avatar_url },
  };
}

// 남의 인벤토리에서 보이는 아이템들을 칸 순서대로 (H-02 아래의 칸들). 비공개는 칸째로 빠지고 나머지가 당겨 붙는다 —
// 저장된 칸 번호는 그대로 두고 읽을 때만 다시 줄 세운다 (docs/data-model.md). 안에 담긴 인벤토리는 그 화면(H-08)을 만들 때 더한다
export async function getVisibleInventoryEntries(inventoryId: string): Promise<SlotEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, name, image_url, quantity, category")
    .eq("inventory_id", inventoryId)
    .is("deleted_at", null)
    .order("slot_index");
  if (error) throw error;

  return data.map((item) => ({
    kind: "item",
    id: item.id,
    name: item.name,
    imageUrl: item.image_url,
    quantity: item.quantity,
    category: item.category,
    deleted: false,
  }));
}
