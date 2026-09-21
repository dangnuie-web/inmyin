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

// 인벤토리 수정. 이름과 카테고리 태그만 고친다 — 사진은 여기서 바꾸지 않는다
export async function updateInventory(inventoryId: string, input: { name: string; categories: string[] }): Promise<FormState> {
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

  const { error } = await supabase.from("inventories").update({ name, categories }).eq("id", inventory.id).eq("user_id", profile.id);
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
