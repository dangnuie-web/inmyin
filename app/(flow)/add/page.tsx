import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/profile";
import { loginPath } from "@/lib/auth/paths";
import { itemCameraPath, NEW_INVENTORY_CAMERA_PATH } from "@/lib/inventory/paths";
import { resolveLastInventory } from "@/lib/inventory/resolve-last-inventory";
import { createClient } from "@/lib/supabase/server";

// 하단 탭 가운데 + (촬영). 화면은 없고 갈 곳만 정한다:
// 1) 마지막에 연 내 인벤토리(쿠키 inmyin-last-inventory, 프로필 격자가 적는다 · 내 프로필 /my 도 같은 것을 처음에 연다)의 촬영
// 2) 쿠키가 없거나 그 인벤토리가 지워졌으면 — 가장 최근에 아이템을 넣은 인벤토리, 그것도 없으면 가장 최근에 만든 인벤토리
//    (설계서는 "updated_at 최신"이었지만 inventories 에 updated_at 칸이 없어서 이렇게 읽는다)
// 3) 인벤토리가 하나도 없으면 새 인벤토리 촬영
// 꽉 찬 인벤토리면 촬영 화면이 인벤토리로 돌려보낸다 (거기에 프리미엄 안내가 있다)
export default async function AddPage() {
  const profile = await getViewer();
  if (!profile) redirect(loginPath("/add"));

  const remembered = await resolveLastInventory(profile.id);
  if (remembered) redirect(itemCameraPath(remembered));

  const supabase = await createClient();
  const { data: recentItem } = await supabase
    .from("items")
    .select("inventory_id, inventories!inner(deleted_at)")
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .is("inventories.deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentItem) redirect(itemCameraPath(recentItem.inventory_id));

  const { data: newest } = await supabase.from("inventories").select("id").eq("user_id", profile.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  redirect(newest ? itemCameraPath(newest.id) : NEW_INVENTORY_CAMERA_PATH);
}
