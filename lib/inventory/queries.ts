import { createClient } from "@/lib/supabase/server";

export type InventorySummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  slotCount: number;
  // 찬 칸 수. 아이템과, 이 안에 담긴 인벤토리가 같은 칸을 쓴다
  usedSlots: number;
  // 이 인벤토리를 담고 있는 인벤토리. 어디에도 안 담겨 있으면 null. 부모는 항상 하나다 (CLAUDE.md 규칙 2)
  parentId: string | null;
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
  // 방금 지운 아이템. 제자리에 "되돌리기" 칸으로 잠깐 남는다 (M-04). 찬 칸으로 세지 않는다
  deleted: boolean;
};

export type InventoryDetail = {
  id: string;
  name: string;
  categories: string[];
  slotCount: number;
  // 순서대로. 번호 사이가 비어 있어도 화면에서는 빈틈 없이 줄 세운다 (docs/data-model.md 규칙 4)
  entries: SlotEntry[];
};

// 내 인벤토리 하나와 그 안에 든 것 (M-04). 없거나 남의 것이면 null.
// deletedItemId — 방금 지운 아이템. 주면 그것도 원래 순서에 끼워서 돌려준다 ("되돌리기" 칸). UUID 인지는 부르는 쪽이 확인한다
export async function getMyInventoryDetail(
  userId: string,
  inventoryId: string,
  deletedItemId: string | null = null,
): Promise<InventoryDetail | null> {
  const supabase = await createClient();
  const items = supabase
    .from("items")
    .select("id, name, image_url, quantity, category, slot_index, deleted_at")
    .eq("inventory_id", inventoryId)
    .eq("user_id", userId);
  const [inventory, itemRows, children] = await Promise.all([
    supabase
      .from("inventories")
      .select("id, name, categories, slot_count")
      .eq("id", inventoryId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle(),
    deletedItemId ? items.or(`deleted_at.is.null,id.eq.${deletedItemId}`) : items.is("deleted_at", null),
    supabase
      .from("inventories")
      .select("id, name, image_url, parent_slot_index")
      .eq("parent_inventory_id", inventoryId)
      .eq("user_id", userId)
      .is("deleted_at", null),
  ]);
  const error = inventory.error ?? itemRows.error ?? children.error;
  if (error) throw error;
  if (!inventory.data) return null;

  const entries = [
    ...itemRows.data!.map((item) => ({
      order: item.slot_index,
      entry: {
        kind: "item" as const,
        id: item.id,
        name: item.name,
        imageUrl: item.image_url,
        quantity: item.quantity,
        category: item.category,
        deleted: item.deleted_at !== null,
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
        deleted: false,
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
    parentId: inventory.parent_inventory_id,
  }));
}

// 짐싸기(M-05)가 쓰는 인벤토리 하나. 목록의 한 줄(사진 · 이름)과 상세의 내용(태그 · 칸)을 같이 가진다
export type PackingInventory = {
  id: string;
  name: string;
  imageUrl: string | null;
  categories: string[];
  slotCount: number;
  entries: SlotEntry[];
};

// 내 인벤토리 전부와 그 안에 든 것 (M-05). 하나씩 따로 읽지 않고 한 번에 읽는다 —
// 짐싸기는 띠에서 인벤토리를 계속 갈아타는 화면이라, 갈아탈 때마다 서버를 기다리면 답답하다
export async function getMyPackingInventories(userId: string): Promise<PackingInventory[]> {
  const supabase = await createClient();
  const [inventories, items] = await Promise.all([
    supabase
      .from("inventories")
      .select("id, name, image_url, categories, slot_count, parent_inventory_id, parent_slot_index")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("items")
      .select("id, inventory_id, name, image_url, quantity, category, slot_index")
      .eq("user_id", userId)
      .is("deleted_at", null),
  ]);
  const error = inventories.error ?? items.error;
  if (error) throw error;

  return inventories.data!.map((inventory) => {
    const entries = [
      ...items
        .data!.filter((item) => item.inventory_id === inventory.id)
        .map((item) => ({
          order: item.slot_index,
          entry: {
            kind: "item" as const,
            id: item.id,
            name: item.name,
            imageUrl: item.image_url,
            quantity: item.quantity,
            category: item.category,
            deleted: false,
          },
        })),
      ...inventories
        .data!.filter((child) => child.parent_inventory_id === inventory.id)
        .map((child) => ({
          order: child.parent_slot_index ?? 0,
          entry: {
            kind: "inventory" as const,
            id: child.id,
            name: child.name,
            imageUrl: child.image_url,
            quantity: 1,
            category: null,
            deleted: false,
          },
        })),
    ];
    entries.sort((a, b) => a.order - b.order);

    return {
      id: inventory.id,
      name: inventory.name,
      imageUrl: inventory.image_url,
      categories: inventory.categories,
      slotCount: inventory.slot_count,
      entries: entries.map(({ entry }) => entry),
    };
  });
}
