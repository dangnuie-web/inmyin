import { createClient } from "@/lib/supabase/server";

export type InventorySummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  slotCount: number;
  // 찬 칸 수. 아이템과, 이 안에 담긴 인벤토리가 같은 칸을 쓴다
  usedSlots: number;
};

// 인벤토리의 한 칸에 든 것. 아이템과, 이 안에 담긴 인벤토리가 같은 칸을 쓴다
export type SlotEntry = {
  kind: "item" | "inventory";
  id: string;
  name: string;
  imageUrl: string | null;
  // 아이템만 가진다
  quantity: number;
  category: string | null;
};

export type InventoryDetail = {
  id: string;
  name: string;
  categories: string[];
  slotCount: number;
  // 순서대로. 번호 사이가 비어 있어도 화면에서는 빈틈 없이 줄 세운다 (docs/data-model.md 규칙 4)
  entries: SlotEntry[];
};

// 내 인벤토리 하나와 그 안에 든 것 (M-04). 없거나 남의 것이면 null
export async function getMyInventoryDetail(userId: string, inventoryId: string): Promise<InventoryDetail | null> {
  const supabase = await createClient();
  const [inventory, items, children] = await Promise.all([
    supabase
      .from("inventories")
      .select("id, name, categories, slot_count")
      .eq("id", inventoryId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("items")
      .select("id, name, image_url, quantity, category, slot_index")
      .eq("inventory_id", inventoryId)
      .eq("user_id", userId)
      .is("deleted_at", null),
    supabase
      .from("inventories")
      .select("id, name, image_url, parent_slot_index")
      .eq("parent_inventory_id", inventoryId)
      .eq("user_id", userId)
      .is("deleted_at", null),
  ]);
  const error = inventory.error ?? items.error ?? children.error;
  if (error) throw error;
  if (!inventory.data) return null;

  const entries = [
    ...items.data!.map((item) => ({
      order: item.slot_index,
      entry: {
        kind: "item" as const,
        id: item.id,
        name: item.name,
        imageUrl: item.image_url,
        quantity: item.quantity,
        category: item.category,
      },
    })),
    ...children.data!.map((child) => ({
      order: child.parent_slot_index ?? 0,
      entry: {
        kind: "inventory" as const,
        id: child.id,
        name: child.name,
        imageUrl: child.image_url,
        quantity: 1,
        category: null,
      },
    })),
  ];
  entries.sort((a, b) => a.order - b.order);

  return {
    id: inventory.data.id,
    name: inventory.data.name,
    categories: inventory.data.categories,
    slotCount: inventory.data.slot_count,
    entries: entries.map(({ entry }) => entry),
  };
}

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
