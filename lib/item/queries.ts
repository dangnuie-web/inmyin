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
