"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { categoryError } from "@/lib/inventory/rules";
import { inventoryPath } from "@/lib/inventory/paths";
import {
  ACQUIRED_NOTE_MAX,
  isDateValue,
  ITEM_DESCRIPTION_MAX,
  ITEM_NAME_MAX,
  ITEM_QUANTITY_MAX,
} from "@/lib/item/rules";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IMAGE_EXTENSIONS = ["webp", "jpg"];

export type NewItemInput = {
  // 브라우저가 미리 정한 id. 사진을 먼저 올려야 해서 파일 이름에 이 id 를 쓴다
  id: string;
  inventoryId: string;
  name: string;
  description: string;
  // 이 인벤토리의 태그 중 하나, 또는 새로 쓴 태그. 고르지 않았으면 null
  category: string | null;
  quantity: number;
  // "20살 생일" 같은 말이나 "26.09.22" 같은 날짜 글자
  acquiredNote: string;
  // 달력이 주는 "2026-09-22" 꼴. 없으면 빈 글자
  expiresAt: string;
  isPublic: boolean;
  imageExtension: string;
};

// M-08 · 아이템 등록. 사진은 브라우저가 저장소에 먼저 올려 두고, 여기서는 DB에 한 줄을 적는다.
// 어느 칸에 들어갈지는 DB가 정한다 — 항상 마지막 아이템의 다음 칸이다 (CLAUDE.md 규칙 3)
export async function createItem(input: NewItemInput): Promise<FormState> {
  const profile = await requireProfile();

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "아이템 이름을 입력해 주세요." };
  if (name.length > ITEM_NAME_MAX) return { error: `아이템 이름은 ${ITEM_NAME_MAX}자까지 쓸 수 있어요.` };

  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!description) return { error: "설명을 입력해 주세요." };
  if (description.length > ITEM_DESCRIPTION_MAX) return { error: `설명은 ${ITEM_DESCRIPTION_MAX}자까지 쓸 수 있어요.` };

  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > ITEM_QUANTITY_MAX) {
    return { error: `개수는 1부터 ${ITEM_QUANTITY_MAX}까지 넣을 수 있어요.` };
  }

  const acquiredNote = typeof input.acquiredNote === "string" ? input.acquiredNote.trim() : "";
  if (acquiredNote.length > ACQUIRED_NOTE_MAX) return { error: `획득날짜는 ${ACQUIRED_NOTE_MAX}자까지 쓸 수 있어요.` };

  if (input.expiresAt && !isDateValue(input.expiresAt)) return { error: "유통기한을 다시 골라 주세요." };

  if (
    !UUID_PATTERN.test(input.id) ||
    !UUID_PATTERN.test(input.inventoryId) ||
    !IMAGE_EXTENSIONS.includes(input.imageExtension)
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

  // 새로 쓴 카테고리는 이 인벤토리의 태그에도 더해 둔다 — 다음 아이템부터는 칩으로 고를 수 있다
  const category = typeof input.category === "string" && input.category.trim() ? input.category.trim() : null;
  if (category && !inventory.categories.includes(category)) {
    const message = categoryError(category, inventory.categories);
    if (message) return { error: message };
    const { error } = await supabase
      .from("inventories")
      .update({ categories: [...inventory.categories, category] })
      .eq("id", inventory.id);
    if (error) return { error: "카테고리를 더하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  // 주소는 브라우저가 보낸 값을 믿지 않고 여기서 만든다 — 항상 내 폴더 안의 파일만 가리킨다
  const path = `${profile.id}/${input.id}.${input.imageExtension}`;
  const { error } = await supabase.from("items").insert({
    id: input.id,
    user_id: profile.id,
    inventory_id: inventory.id,
    name,
    description,
    category,
    quantity: input.quantity,
    acquired_note: acquiredNote || null,
    expires_at: input.expiresAt || null,
    is_public: input.isPublic === true,
    image_url: supabase.storage.from("items").getPublicUrl(path).data.publicUrl,
    // 원본은 비공개 저장소라 주소 대신 경로를 적어 둔다
    raw_image_url: path,
  });
  if (error) {
    // DB 트리거가 한국어로 이유를 알려준다 (예: 인벤토리가 꽉 찼습니다)
    return { error: error.code === "P0001" ? error.message : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath(inventoryPath(inventory.id));
  // added — 상세 화면이 새로 들어간 칸으로 스크롤하고 잠깐 강조한다
  redirect(inventoryPath(inventory.id, { added: input.id }));
}
