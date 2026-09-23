import type { UserCard } from "@/lib/follow/queries";
import type { InventoryDetail, InventorySummary, SlotEntry } from "@/lib/inventory/queries";
import type { CollectedItem } from "@/lib/item/queries";
import { createClient } from "@/lib/supabase/server";
import type { ProfileItem, ProfilePost } from "./queries";

// ---- 남의 것을 읽는 조회 (타유저 프로필 H-06 ~ H-08).
// 무엇이 보이는지는 DB 규칙(RLS)이 정한다 — 비공개 아이템, 비공개 인벤토리와 그 안의 것은 애초에 돌아오지 않는다.
// 그래서 여기서는 "보이는 것"을 그대로 줄 세우기만 한다 (docs/data-model.md "비공개 아이템 · 인벤토리 읽기") ----

export type PublicProfile = UserCard & {
  bio: string | null;
  followerCount: number;
  followingCount: number;
  // 보이는 아이템 수와, 그중 최근 것
  itemCount: number;
  postCount: number;
  recentItems: ProfileItem[];
  recentPosts: ProfilePost[];
};

const RECENT_ITEM_LIMIT = 12;
const RECENT_POST_LIMIT = 12;

// 아이디로 사람 하나 (H-06). 없거나 탈퇴했으면 null
export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, handle, nickname, avatar_url, bio")
    .eq("handle", handle)
    .is("deleted_at", null)
    .maybeSingle();
  if (userError) throw userError;
  if (!user) return null;

  const count = { count: "exact", head: true } as const;
  const [followers, following, posts, items] = await Promise.all([
    supabase.from("follows").select("follower_id", count).eq("following_id", user.id),
    supabase.from("follows").select("following_id", count).eq("follower_id", user.id),
    supabase
      .from("inmyin_posts")
      .select("id, title, image_url", { count: "exact" })
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(RECENT_POST_LIMIT),
    supabase
      .from("items")
      .select("id, name, image_url", { count: "exact" })
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(RECENT_ITEM_LIMIT),
  ]);
  const error = followers.error ?? following.error ?? posts.error ?? items.error;
  if (error) throw error;

  return {
    id: user.id,
    handle: user.handle,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    followerCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
    postCount: posts.count ?? 0,
    itemCount: items.count ?? 0,
    recentItems: (items.data ?? []).map((item) => ({ id: item.id, name: item.name, imageUrl: item.image_url })),
    recentPosts: (posts.data ?? []).map((post) => ({ id: post.id, title: post.title, imageUrl: post.image_url })),
  };
}

// 그 사람의 보이는 인벤토리들 (H-07 · H-08 의 띠). 내 것의 getMyInventories 와 같은 모양.
// usedSlots 는 보이는 것만 센다 — 남이 보는 화면이니 그게 맞다
export async function getVisibleInventories(userId: string): Promise<InventorySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventories")
    .select("id, name, image_url, slot_count, parent_inventory_id, items(count)")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .is("items.deleted_at", null)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;

  return data.map((inventory) => ({
    id: inventory.id,
    name: inventory.name,
    imageUrl: inventory.image_url,
    slotCount: inventory.slot_count,
    usedSlots: (inventory.items[0]?.count ?? 0) + data.filter((child) => child.parent_inventory_id === inventory.id).length,
    parentId: inventory.parent_inventory_id,
  }));
}

// 그 사람의 인벤토리 하나와 그 안에서 보이는 것 (H-08). 없거나 못 보는 것이면 null.
// 칸 번호는 저장된 대로 두고, 보이는 것끼리 순서대로 당겨 붙인다
export async function getVisibleInventoryDetail(userId: string, inventoryId: string): Promise<InventoryDetail | null> {
  const supabase = await createClient();
  const [inventory, items, children] = await Promise.all([
    supabase
      .from("inventories")
      .select("id, name, categories, slot_count, is_public")
      .eq("id", inventoryId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase.from("items").select("id, name, image_url, quantity, category, slot_index").eq("inventory_id", inventoryId).is("deleted_at", null),
    supabase.from("inventories").select("id, name, image_url, parent_slot_index").eq("parent_inventory_id", inventoryId).is("deleted_at", null),
  ]);
  const error = inventory.error ?? items.error ?? children.error;
  if (error) throw error;
  if (!inventory.data) return null;

  const entries: { order: number; entry: SlotEntry }[] = [
    ...(items.data ?? []).map((item) => ({
      order: item.slot_index,
      entry: { kind: "item" as const, id: item.id, name: item.name, imageUrl: item.image_url, quantity: item.quantity, category: item.category, deleted: false },
    })),
    ...(children.data ?? []).map((child) => ({
      order: child.parent_slot_index ?? Number.MAX_SAFE_INTEGER,
      entry: { kind: "inventory" as const, id: child.id, name: child.name, imageUrl: child.image_url, quantity: 1, category: null, deleted: false },
    })),
  ];
  entries.sort((a, b) => a.order - b.order);

  return {
    id: inventory.data.id,
    name: inventory.data.name,
    categories: inventory.data.categories,
    slotCount: inventory.data.slot_count,
    isPublic: inventory.data.is_public,
    entries: entries.map(({ entry }) => entry),
  };
}

// 그 사람의 보이는 아이템 전부, 최신순 (타유저의 아이템 모아보기). 내 것의 getMyItemCollection 과 같은 모양
export async function getVisibleItemCollection(userId: string): Promise<CollectedItem[]> {
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
