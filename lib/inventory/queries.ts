import { createClient } from "@/lib/supabase/server";

export type InventorySummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  slotCount: number;
  // 찬 칸 수. 아이템과, 이 안에 담긴 인벤토리가 같은 칸을 쓴다
  usedSlots: number;
};

// 내 인벤토리 전부. 다른 인벤토리 안에 담긴 것도 목록에는 같이 나온다 (M-03)
export async function getMyInventories(userId: string): Promise<InventorySummary[]> {
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
    usedSlots:
      (inventory.items[0]?.count ?? 0) +
      data.filter((child) => child.parent_inventory_id === inventory.id).length,
  }));
}
