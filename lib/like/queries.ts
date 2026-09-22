import type { CollectedItem } from "@/lib/item/queries";
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

// 내가 좋아요한 아이템들, 최근에 누른 순 (Like 탭 V-01). 좋아요 표는 아이템 표를 직접 가리키지 않아서(게시물과 공용)
// 좋아요를 먼저 읽고 그 아이템들을 다시 읽는다 — 그사이 비공개가 되거나 지워진 것은 DB 규칙이 빼 준다
export async function getMyLikedItems(userId: string): Promise<CollectedItem[]> {
  const supabase = await createClient();
  const { data: likes, error: likesError } = await supabase
    .from("likes")
    .select("target_id")
    .eq("user_id", userId)
    .eq("target_type", "item")
    .order("created_at", { ascending: false })
    .limit(LIKED_ITEMS_LIMIT);
  if (likesError) throw likesError;
  if (likes.length === 0) return [];

  const ids = likes.map((like) => like.target_id);
  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, image_url, quantity, category, inventories!inner(name), users!inner(nickname)")
    .in("id", ids)
    .is("deleted_at", null);
  if (error) throw error;

  // 누른 순서대로
  const byId = new Map(items.map((item) => [item.id, item]));
  return ids.flatMap((id) => {
    const item = byId.get(id);
    return item
      ? [{ id: item.id, name: item.name, imageUrl: item.image_url, quantity: item.quantity, category: item.category, inventoryName: item.inventories.name, ownerNickname: item.users.nickname }]
      : [];
  });
}

const LIKED_ITEMS_LIMIT = 300;
