"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { inventoryPath, itemPath } from "@/lib/inventory/paths";
import { cleanItemFields, type ItemFieldsInput } from "@/lib/item/rules";
import { addCategoryToInventory } from "@/lib/item/save";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BAD_REQUEST = { error: "잘못된 요청입니다. 처음부터 다시 시도해 주세요." };

// 아이템이 바뀌면 다시 그려야 하는 화면들: 그 인벤토리(M-04), 아이템 상세(M-14), 인벤토리 목록의 개수(M-03)
function revalidateItem(itemId: string, inventoryId: string) {
  revalidatePath(inventoryPath(inventoryId));
  revalidatePath(itemPath(itemId));
  revalidatePath("/my/inventories");
}

// 아이템 수정. 글자 정보만 고친다 — 사진과 들어 있는 인벤토리는 여기서 바꾸지 않는다
export async function updateItem(itemId: string, input: ItemFieldsInput): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(itemId)) return BAD_REQUEST;

  const cleaned = cleanItemFields(input);
  if ("error" in cleaned) return { error: cleaned.error };

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("items")
    .select("id, inventory_id, inventories!inner(id, categories)")
    .eq("id", itemId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!item) return { error: "아이템을 찾을 수 없습니다." };

  const categoryMessage = await addCategoryToInventory(supabase, item.inventories, cleaned.fields.category);
  if (categoryMessage) return { error: categoryMessage };

  const { error } = await supabase.from("items").update(cleaned.fields).eq("id", item.id).eq("user_id", profile.id);
  if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  revalidateItem(item.id, item.inventory_id);
  // 고친 결과를 바로 볼 수 있게 상세로 돌아간다
  redirect(itemPath(item.id));
}

// 아이템 삭제. 실제로 지우지 않고 지운 때를 적는다 (CLAUDE.md 규칙 6) — 과거 INMYIN 게시물이 이 아이템을 가리키고 있다.
// 뒤의 아이템들은 화면에서 저절로 한 칸씩 당겨 붙는다 (규칙 3)
export async function deleteItem(itemId: string): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(itemId)) return BAD_REQUEST;

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itemId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .select("id, inventory_id")
    .maybeSingle();
  if (error || !item) return { error: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  revalidateItem(item.id, item.inventory_id);
  return {};
}

// 삭제 되돌리기. 원래 있던 순서로 돌아간다 — 그 자리를 그사이 다른 것이 차지했으면 맨 뒤로 (DB 트리거가 정한다)
export async function restoreItem(itemId: string): Promise<FormState> {
  const profile = await requireProfile();
  if (!UUID_PATTERN.test(itemId)) return BAD_REQUEST;

  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("items")
    .update({ deleted_at: null })
    .eq("id", itemId)
    .eq("user_id", profile.id)
    .not("deleted_at", "is", null)
    .select("id, inventory_id")
    .maybeSingle();
  if (error || !item) {
    // DB 트리거가 한국어로 이유를 알려준다 (예: 인벤토리가 꽉 찼습니다)
    return { error: error?.code === "P0001" ? error.message : "되돌리지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidateItem(item.id, item.inventory_id);
  return {};
}
