import type { Metadata } from "next";
import { ProfileInventoryScreen } from "@/components/inventory/ProfileInventoryScreen";
import { toGridColumns } from "@/components/inventory/Slot";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { myShellProps } from "@/components/profile/ProfileShells";
import { requireProfile } from "@/lib/auth/profile";
import { getMyInventories, getMyInventoryDetail } from "@/lib/inventory/queries";
import { readLastInventoryId } from "@/lib/inventory/resolve-last-inventory";
import { planLimits } from "@/lib/plans";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "프로필 · INMYIN" };

// M-01 · 내 프로필 = 프로필 첫 화면. 프로필 줄 → 세 탭 → 인벤토리 탭(띠 + 격자, 무늬 빈화면프로필설계 v01 2절).
// 처음 고른 인벤토리 = 마지막에 연 것(쿠키, 하단 탭 + 와 같은 것) → 없거나 지워졌으면 순서 1번 (2-2, 2026-10-20 당니님 결정).
// 다른 인벤토리를 고르면 /my/inventories/[id] 로 주소가 바뀐다 — 같은 화면
export default async function MyProfilePage() {
  const profile = await requireProfile();
  const [stats, inventories, remembered] = await Promise.all([getMyProfileStats(profile.id), getMyInventories(profile.id), readLastInventoryId()]);
  const { maxInventories } = planLimits(profile.plan);

  // 내 인벤토리 목록에 있으면 내 것이고 살아 있다 — DB 를 따로 묻지 않는다
  const currentId = inventories.find((inventory) => inventory.id === remembered)?.id ?? inventories[0]?.id ?? null;
  const inventory = currentId ? await getMyInventoryDetail(profile.id, currentId) : null;

  return (
    <ProfileShell {...myShellProps(profile, stats)} tab="inventory">
      <ProfileInventoryScreen
        mine
        inventories={inventories}
        inventory={inventory}
        view="grid"
        category={null}
        addedId={null}
        deletedId={null}
        maxInventories={maxInventories}
        columns={toGridColumns(profile.grid_columns)}
      />
    </ProfileShell>
  );
}
