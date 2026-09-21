"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { cleanCategories, INVENTORY_NAME_MAX } from "@/lib/inventory/rules";
import { planLimits } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const IMAGE_EXTENSIONS = ["webp", "jpg"];

export type NewInventoryInput = {
  // 브라우저가 미리 정한 id. 사진을 먼저 올려야 해서 파일 이름에 이 id 를 쓴다
  id: string;
  name: string;
  categories: string[];
  // 올린 사진의 확장자. 사진은 필수다 — + 가 항상 사진 고르기로 시작한다
  imageExtension: string;
};

// M-03 · 인벤토리 만들기. 사진은 브라우저가 저장소에 먼저 올려 두고, 여기서는 DB에 한 줄을 적는다.
export async function createInventory(input: NewInventoryInput): Promise<FormState> {
  const profile = await requireProfile();

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "인벤토리 이름을 입력해 주세요." };
  if (name.length > INVENTORY_NAME_MAX) {
    return { error: `인벤토리 이름은 ${INVENTORY_NAME_MAX}자까지 쓸 수 있어요.` };
  }

  const categories = cleanCategories(input.categories);
  if (!categories) return { error: "카테고리를 다시 확인해 주세요." };

  if (!UUID_PATTERN.test(input.id) || !IMAGE_EXTENSIONS.includes(input.imageExtension)) {
    return { error: "잘못된 요청입니다. 처음부터 다시 시도해 주세요." };
  }

  const supabase = await createClient();

  // 플랜 한도. 화면에서도 + 를 숨기지만, 서버에서 한 번 더 막는다
  const { maxInventories, slotCount } = planLimits(profile.plan);
  const { count, error: countError } = await supabase
    .from("inventories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("deleted_at", null);
  if (countError) return { error: "잠시 후 다시 시도해 주세요." };
  if ((count ?? 0) >= maxInventories) {
    return { error: `인벤토리는 ${maxInventories}개까지 만들 수 있어요.` };
  }

  // 주소는 브라우저가 보낸 값을 믿지 않고 여기서 만든다 — 항상 내 폴더 안의 파일만 가리킨다
  const path = `${profile.id}/${input.id}.${input.imageExtension}`;
  const { error } = await supabase.from("inventories").insert({
    id: input.id,
    user_id: profile.id,
    name,
    categories,
    slot_count: slotCount,
    sort_order: count ?? 0,
    image_url: supabase.storage.from("inventories").getPublicUrl(path).data.publicUrl,
    // 원본은 비공개 저장소라 주소 대신 경로를 적어 둔다
    raw_image_url: path,
  });
  if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  revalidatePath("/my/inventories");
  redirect("/my/inventories");
}
