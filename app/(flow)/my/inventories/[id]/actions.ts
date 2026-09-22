"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { inventoryPath } from "@/lib/inventory/paths";
import { cleanCategories, INVENTORY_NAME_MAX } from "@/lib/inventory/rules";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BAD_REQUEST = { error: "잘못된 요청입니다. 처음부터 다시 시도해 주세요." };

type Supabase = Awaited<ReturnType<typeof createClient>>;

// 인벤토리가 바뀌면 다시 그려야 하는 화면들: 목록(M-03)과 그 인벤토리(M-04)
function revalidateInventory(inventoryId: string) {
  revalidatePath("/my/inventories");
  revalidatePath(inventoryPath(inventoryId));
}

// 지워졌든 아니든 내 인벤토리가 맞는지
async function inventoryExists(supabase: Supabase, userId: string, inventoryId: string) {
  const { data } = await supabase.from("inventories").select("id").eq("id", inventoryId).eq("user_id", userId).maybeSingle();
  return data !== null;
}

// 인벤토리 수정. 이름 · 카테고리 태그 · 공개 여부를 고친다 — 사진은 여기서 바꾸지 않는다
export async function updateInventory(inventoryId: string, input: { name: string; categories: string[]; isPublic: boolean }): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(inventoryId)) return BAD_REQUEST;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "인벤토리 이름을 입력해 주세요." };
  if (name.length > INVENTORY_NAME_MAX) return { error: `인벤토리 이름은 ${INVENTORY_NAME_MAX}자까지 쓸 수 있어요.` };

  const categories = cleanCategories(input.categories);
  if (!categories) return { error: "카테고리를 다시 확인해 주세요." };

  const supabase = await createClient();
  const { data: inventory } = await supabase
    .from("inventories")
    .select("id, categories")
    .eq("id", inventoryId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!inventory) return { error: "인벤토리를 찾을 수 없습니다." };

  const { error } = await supabase
    .from("inventories")
    .update({ name, categories, is_public: input.isPublic !== false })
    .eq("id", inventory.id)
    .eq("user_id", profile.id);
  if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  // 없앤 태그는 그 태그를 달고 있던 아이템에서도 뗀다. 안 그러면 어디에도 안 보이는 태그가 아이템에 남는다.
  // 태그가 없는 아이템은 "전체"에서만 보인다 (CLAUDE.md 규칙 4)
  const removed = inventory.categories.filter((tag) => !categories.includes(tag));
  if (removed.length > 0) {
    await supabase.from("items").update({ category: null }).eq("inventory_id", inventory.id).eq("user_id", profile.id).in("category", removed);
  }

  revalidateInventory(inventory.id);
  redirect("/my/inventories");
}

// 인벤토리 삭제. **비어 있을 때만** 된다 — 안에 든 것까지 말없이 사라지면 안 된다.
// 실제로 지우지 않고 지운 때를 적는다 (CLAUDE.md 규칙 6)
export async function deleteInventory(inventoryId: string): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(inventoryId)) return BAD_REQUEST;

  const supabase = await createClient();
  const [items, children] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }).eq("inventory_id", inventoryId).is("deleted_at", null),
    supabase.from("inventories").select("id", { count: "exact", head: true }).eq("parent_inventory_id", inventoryId).is("deleted_at", null),
  ]);
  if (items.error || children.error) return { error: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  if ((items.count ?? 0) + (children.count ?? 0) > 0) {
    return { error: "안에 든 것이 있어요. 먼저 비운 뒤에 삭제할 수 있어요." };
  }

  const { data: inventory, error } = await supabase
    .from("inventories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", inventoryId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return { error: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  // 고친 줄이 없다 = 이미 지워져 있다 (같은 요청이 두 번 온 경우). 바라던 결과와 같으니 성공이다
  if (!inventory && !(await inventoryExists(supabase, profile.id, inventoryId))) return { error: "인벤토리를 찾을 수 없습니다." };

  revalidateInventory(inventoryId);
  return {};
}

// 삭제 되돌리기. 목록의 순서(sort_order)는 지워도 그대로라서 원래 자리로 돌아간다
export async function restoreInventory(inventoryId: string): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(inventoryId)) return BAD_REQUEST;

  const supabase = await createClient();
  // 그사이 다른 인벤토리를 만들어 한도를 채웠으면 되살릴 수 없다
  const { maxInventories } = planLimits(profile.plan);
  const { count, error: countError } = await supabase
    .from("inventories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .neq("id", inventoryId);
  if (countError) return { error: "되돌리지 못했습니다. 잠시 후 다시 시도해 주세요." };
  if ((count ?? 0) >= maxInventories) return { error: `인벤토리는 ${maxInventories}개까지 만들 수 있어요.` };

  const { data: inventory, error } = await supabase
    .from("inventories")
    .update({ deleted_at: null })
    .eq("id", inventoryId)
    .eq("user_id", profile.id)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();
  if (error) {
    // DB 트리거가 한국어로 이유를 알려준다 (예: 인벤토리가 꽉 찼습니다)
    return { error: error.code === "P0001" ? error.message : "되돌리지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  // 고친 줄이 없다 = 이미 살아 있다 (되돌리기를 여러 번 누른 경우). 바라던 결과와 같으니 성공이다
  if (!inventory && !(await inventoryExists(supabase, profile.id, inventoryId))) return { error: "인벤토리를 찾을 수 없습니다." };

  revalidateInventory(inventoryId);
  return {};
}

// 인벤토리의 부모를 바꾼다. 가져오기 · 꺼내기 · 짐싸기로 옮기기가 같이 쓴다.
// 순환(자기 안에 든 것 속으로 들어가기) · 5겹 한도 · 받는 쪽이 꽉 찼는지는 DB 트리거가 막고, 한국어로 이유를 알려준다.
// 새로 들어가는 자리는 항상 받는 쪽의 맨 뒤 칸이다 — 그것도 DB가 정한다 (CLAUDE.md 규칙 3)
async function setParent(
  inventoryId: string,
  toParentId: string | null,
  // 지금 어디에 있어야 하는지. 가져오기는 "아무 데도 안 담겨 있어야"(false), 꺼내기와 옮기기는 "어딘가에 담겨 있어야"(true) 한다
  mustBeNested: boolean,
): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(inventoryId) || (toParentId !== null && !UUID_PATTERN.test(toParentId))) return BAD_REQUEST;
  if (inventoryId === toParentId) return { error: "자기 자신 안에는 담을 수 없습니다." };

  const supabase = await createClient();
  const { data: inventory } = await supabase
    .from("inventories")
    .select("id, parent_inventory_id")
    .eq("id", inventoryId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!inventory) return { error: "인벤토리를 찾을 수 없습니다." };
  // 이미 그렇게 되어 있다 (같은 요청이 두 번 온 경우). 바라던 결과와 같으니 성공이다
  if (inventory.parent_inventory_id === toParentId) return {};
  // 인벤토리도 실제 물건이라 부모는 항상 하나다 (CLAUDE.md 규칙 2). 이미 어딘가에 든 것을 또 가져올 수는 없다
  if (!mustBeNested && inventory.parent_inventory_id) return { error: "이미 다른 인벤토리 안에 들어 있어요. 먼저 꺼내 주세요." };
  if (mustBeNested && !inventory.parent_inventory_id) return { error: "어디에도 담겨 있지 않은 인벤토리예요." };

  const { error } = await supabase
    .from("inventories")
    // 꺼낼 때는 칸 번호도 같이 비운다 (둘은 같이 있거나 같이 없어야 한다). 담을 때의 번호는 DB가 정한다
    .update(toParentId ? { parent_inventory_id: toParentId } : { parent_inventory_id: null, parent_slot_index: null })
    .eq("id", inventory.id)
    .eq("user_id", profile.id);
  if (error) return { error: error.code === "P0001" ? error.message : "옮기지 못했습니다. 잠시 후 다시 시도해 주세요." };

  revalidateInventory(inventory.id);
  if (inventory.parent_inventory_id) revalidatePath(inventoryPath(inventory.parent_inventory_id));
  if (toParentId) revalidatePath(inventoryPath(toParentId));
  return {};
}

// 인벤토리 가져오기 (M-04 의 + 메뉴). 다른 인벤토리를 통째로 이 인벤토리의 칸에 담는다
export async function bringInventory(inventoryId: string, intoInventoryId: string) {
  return setParent(inventoryId, intoInventoryId, false);
}

// 꺼내기. 담겨 있던 인벤토리를 밖으로 꺼낸다 — 안에 든 것은 그대로다
export async function takeOutInventory(inventoryId: string) {
  return setParent(inventoryId, null, true);
}

// 짐싸기(M-05). 담겨 있던 인벤토리를 다른 인벤토리로 옮긴다
export async function moveInventory(inventoryId: string, toInventoryId: string) {
  return setParent(inventoryId, toInventoryId, true);
}
