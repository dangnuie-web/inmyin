import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileInventoryScreen } from "@/components/inventory/ProfileInventoryScreen";
import { toGridColumns } from "@/components/inventory/Slot";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { myShellProps } from "@/components/profile/ProfileShells";
import { requireProfile } from "@/lib/auth/profile";
import type { InventoryView } from "@/lib/inventory/paths";
import { getMyInventories, getMyInventoryDetail } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-04 · 내 프로필의 그 인벤토리가 고른 상태 — /my 와 같은 화면(프로필 줄 · 세 탭 · 띠 · 격자), 하단 탭도 있다.
// 띠에서 갈아타면 주소가 바뀌어 새로고침 · 공유 · 뒤로 가기 · ?added= 가 다 그대로 산다 (무늬 빈화면프로필설계 v01 2-1)
export default async function InventoryDetailPage(props: PageProps<"/my/inventories/[id]">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  if (!UUID_PATTERN.test(id)) notFound();

  // 방금 지운 아이템. 제자리에 "되돌리기" 칸으로 잠깐 남긴다
  const deletedId = typeof searchParams.deleted === "string" && UUID_PATTERN.test(searchParams.deleted) ? searchParams.deleted : null;

  const [inventory, inventories, stats] = await Promise.all([getMyInventoryDetail(profile.id, id, deletedId), getMyInventories(profile.id), getMyProfileStats(profile.id)]);
  if (!inventory) notFound();

  // 방금 저장한 아이템 (items/new/actions.ts 의 redirect). 그 칸을 알리고, 설치 안내를 띄울지 본다
  const addedId = typeof searchParams.added === "string" ? searchParams.added : null;
  const view: InventoryView = searchParams.view === "list" ? "list" : "grid";

  return (
    <ProfileShell {...myShellProps(profile, stats)} tab="inventory">
      <ProfileInventoryScreen
        mine
        inventories={inventories}
        inventory={inventory}
        view={view}
        category={typeof searchParams.category === "string" ? searchParams.category : null}
        addedId={addedId}
        deletedId={deletedId}
        maxInventories={planLimits(profile.plan).maxInventories}
        columns={toGridColumns(profile.grid_columns)}
      />
    </ProfileShell>
  );
}
