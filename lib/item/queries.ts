import { createClient } from "@/lib/supabase/server";

export type ItemDetail = {
  id: string;
  // 지금 들어 있는 인벤토리. 짐싸기로 옮기면 바뀐다
  inventoryId: string;
  name: string;
  description: string | null;
  imageUrl: string;
  quantity: number;
  // "20살 생일" 같은 말이나 "26.09.22" 같은 날짜 글자
  acquiredNote: string | null;
  // "2026-09-22" 꼴
  expiresAt: string | null;
};

// 내 아이템 하나 (M-14). 없거나 지워졌거나 남의 것이면 null.
// 남의 공개 아이템을 보는 것은 2단계(타유저 프로필)에서 더한다
export async function getMyItemDetail(userId: string, itemId: string): Promise<ItemDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, inventory_id, name, description, image_url, quantity, acquired_note, expires_at")
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
    quantity: data.quantity,
    acquiredNote: data.acquired_note,
    expiresAt: data.expires_at,
  };
}
