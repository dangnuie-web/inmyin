"use server";

import { revalidatePath } from "next/cache";
import { GRID_COLUMN_CHOICES, type GridColumns } from "@/components/inventory/Slot";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

// 설정(M-02) › 격자 한 줄의 칸 수. 계정에 남아서 어느 기기에서든 같다
export async function updateGridColumns(columns: GridColumns): Promise<FormState> {
  const profile = await requireProfile();
  if (!(GRID_COLUMN_CHOICES as readonly number[]).includes(columns)) return { error: "잘못된 값입니다." };

  const supabase = await createClient();
  const { error } = await supabase.from("users").update({ grid_columns: columns }).eq("id", profile.id);
  if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  // 격자가 있는 화면들(M-04 · M-05 · M-13 · M-14)이 다음에 열릴 때 새 칸 수로 그려지게
  revalidatePath("/", "layout");
  return {};
}
