import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LAST_INVENTORY_COOKIE } from "./last-inventory";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 쿠키에 적힌 "마지막에 연 인벤토리" id. 모양만 본다 — 내 것인지 · 살아 있는지는 부르는 쪽이 본다
// (내 인벤토리 목록을 이미 읽은 곳은 그 목록에서 찾으면 DB 를 한 번 덜 읽는다 — 내 프로필 /my)
export async function readLastInventoryId(): Promise<string | null> {
  const remembered = (await cookies()).get(LAST_INVENTORY_COOKIE)?.value;
  return remembered && UUID_PATTERN.test(remembered) ? remembered : null;
}

// 마지막에 연 인벤토리가 내 것이고 살아 있으면 그 id, 아니면 null.
// 하단 탭 + (/add)와 내 프로필(/my)이 같은 것을 기억한다 — 앱이 한 가지를 기억한다 (무늬 빈화면프로필설계 v01 2-2)
export async function resolveLastInventory(userId: string): Promise<string | null> {
  const remembered = await readLastInventoryId();
  if (!remembered) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("inventories").select("id").eq("id", remembered).eq("user_id", userId).is("deleted_at", null).maybeSingle();
  return data?.id ?? null;
}
