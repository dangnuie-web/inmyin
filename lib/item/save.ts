import { categoryError } from "@/lib/inventory/rules";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// 아이템에 새로 쓴 카테고리는 그 인벤토리의 태그에도 더해 둔다 — 다음 아이템부터는 칩으로 고를 수 있다.
// 등록과 수정이 같이 쓴다. 못 더하면 이유를 돌려준다
export async function addCategoryToInventory(
  supabase: Supabase,
  inventory: { id: string; categories: string[] },
  category: string | null,
) {
  if (!category || inventory.categories.includes(category)) return;

  const message = categoryError(category, inventory.categories);
  if (message) return message;
  const { error } = await supabase
    .from("inventories")
    .update({ categories: [...inventory.categories, category] })
    .eq("id", inventory.id);
  if (error) return "카테고리를 더하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
