import { createClient } from "@/lib/supabase/server";
import type { ItemStamp } from "./target";

export type InventorySummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  slotCount: number;
  // 찬 칸 수. 아이템과, 이 안에 담긴 인벤토리가 같은 칸을 쓴다
  usedSlots: number;
  // 이 인벤토리를 담고 있는 인벤토리. 어디에도 안 담겨 있으면 null. 부모는 항상 하나다 (CLAUDE.md 규칙 2)
  parentId: string | null;
  // 남에게 보이는가. 내 띠 · 이름 줄 · 관리 줄에 자물쇠로 보인다 (남의 띠에는 비공개가 아예 안 온다 — DB 규칙)
  isPublic: boolean;
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
  // 고정 카테고리(홈 · 발견 칩). 기존 인벤토리는 null — 한 번 골라 달라고 안내한다
  category: string | null;
  slotCount: number;
  // 남에게 보이는가. 꺼져 있으면 안의 아이템까지 통째로 숨는다
  isPublic: boolean;
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
      .select("id, name, categories, category, slot_count, is_public")
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
    category: inventory.data.category,
    isPublic: inventory.data.is_public,
    slotCount: inventory.data.slot_count,
    entries: entries.map(({ entry }) => entry),
  };
}

// 아이템을 넣을 곳을 고를 때 쓰는 인벤토리 하나 (아이템 정보 입력 M-08 의 "넣을 곳" 판 · /add).
// 줄 모양(사진 · 이름 · 12/25 · 담긴 곳)에 더해, 고른 뒤 칩으로 쓸 태그와 "최근 만든 곳"을 가릴 만든 때를 가진다
export type InventoryChoice = InventorySummary & {
  categories: string[];
  createdAt: string;
};

// 내 인벤토리 전부, 순서(sort_order — 인벤토리 관리에서 바꾼다)대로. 다른 인벤토리 안에 담긴 것도 같이 나온다 (띠 · 관리 · 넣을 곳)
export async function getMyInventories(userId: string): Promise<InventoryChoice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventories")
    .select("id, name, image_url, slot_count, parent_inventory_id, is_public, categories, created_at, items(count)")
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
    isPublic: inventory.is_public,
    categories: inventory.categories,
    createdAt: inventory.created_at,
  }));
}

// 내 아이템 전부의 어디 · 언제 · 카테고리 (지운 것 · 지운 인벤토리의 것은 빼고). 넣을 곳의 기본값을 고를 때 쓴다 (lib/inventory/target.ts)
export async function getMyItemStamps(userId: string): Promise<ItemStamp[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("inventory_id, category, created_at, inventories!inner(deleted_at)")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .is("inventories.deleted_at", null);
  if (error) throw error;
  return data.map((item) => ({ inventoryId: item.inventory_id, category: item.category, createdAt: item.created_at }));
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
