"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { inventoryPath } from "@/lib/inventory/paths";
import { cleanItemFields, type ItemFieldsInput } from "@/lib/item/rules";
import { addCategoryToInventory } from "@/lib/item/save";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// png 는 배경을 지운 썸네일 (webp 로 못 만드는 사파리에서)
const IMAGE_EXTENSIONS = ["webp", "jpg", "png"];

export type NewItemInput = ItemFieldsInput & {
  // 브라우저가 미리 정한 id. 사진을 먼저 올려야 해서 파일 이름에 이 id 를 쓴다
  id: string;
  inventoryId: string;
  imageExtension: string;
  // 원본의 확장자. 썸네일과 다를 수 있다
  rawImageExtension: string;
};

// M-08 · 아이템 등록. 사진은 브라우저가 저장소에 먼저 올려 두고, 여기서는 DB에 한 줄을 적는다.
// 어느 칸에 들어갈지는 DB가 정한다 — 항상 마지막 아이템의 다음 칸이다 (CLAUDE.md 규칙 3)
export async function createItem(input: NewItemInput): Promise<FormState> {
  const profile = await requireProfile();

  const cleaned = cleanItemFields(input);
  if ("error" in cleaned) return { error: cleaned.error };

  if (
    !UUID_PATTERN.test(input.id) ||
    !UUID_PATTERN.test(input.inventoryId) ||
    !IMAGE_EXTENSIONS.includes(input.imageExtension) ||
    !IMAGE_EXTENSIONS.includes(input.rawImageExtension)
  ) {
    return { error: "잘못된 요청입니다. 처음부터 다시 시도해 주세요." };
  }

  const supabase = await createClient();

  const { data: inventory } = await supabase
    .from("inventories")
    .select("id, categories")
    .eq("id", input.inventoryId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!inventory) return { error: "인벤토리를 찾을 수 없습니다." };

  const categoryMessage = await addCategoryToInventory(supabase, inventory, cleaned.fields.category);
  if (categoryMessage) return { error: categoryMessage };

  // 주소는 브라우저가 보낸 값을 믿지 않고 여기서 만든다 — 항상 내 폴더 안의 파일만 가리킨다
  const path = `${profile.id}/${input.id}.${input.imageExtension}`;
  const rawPath = `${profile.id}/${input.id}.${input.rawImageExtension}`;
  const { error } = await supabase.from("items").insert({
    id: input.id,
    user_id: profile.id,
    inventory_id: inventory.id,
    ...cleaned.fields,
    image_url: supabase.storage.from("items").getPublicUrl(path).data.publicUrl,
    // 원본은 비공개 저장소라 주소 대신 경로를 적어 둔다
    raw_image_url: rawPath,
  });
  if (error) {
    // DB 트리거가 한국어로 이유를 알려준다 (예: 인벤토리가 꽉 찼습니다)
    return { error: error.code === "P0001" ? error.message : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath(inventoryPath(inventory.id));
  // added — 상세 화면이 새로 들어간 칸으로 스크롤하고 잠깐 강조한다
  redirect(inventoryPath(inventory.id, { added: input.id }));
}
