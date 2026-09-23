"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

// 알림 화면을 열면 "여기까지 봤다"고 적는다 — 종의 빨간 점이 꺼진다.
// 화면이 그려진 뒤 브라우저가 부른다 (미리 읽기(prefetch)로 화면이 준비될 때 본 것으로 치지 않으려고)
export async function markNotificationsSeen() {
  const profile = await requireProfile();
  const supabase = await createClient();
  await supabase.from("users").update({ notifications_seen_at: new Date().toISOString() }).eq("id", profile.id);
  revalidatePath("/");
}
