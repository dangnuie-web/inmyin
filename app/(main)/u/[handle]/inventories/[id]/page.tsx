import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProfileInventoryScreen } from "@/components/inventory/ProfileInventoryScreen";
import { DEFAULT_GRID_COLUMNS, toGridColumns } from "@/components/inventory/Slot";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { loadOtherProfile, otherShellProps } from "@/components/profile/ProfileShells";
import { inventoryPath, type InventoryView } from "@/lib/inventory/paths";
import { profilePath } from "@/lib/profile/paths";
import { getVisibleInventories, getVisibleInventoryDetail } from "@/lib/profile/public-queries";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// H-08 · 그 사람의 프로필에서 그 인벤토리를 고른 상태 — /u/[handle] 과 같은 화면.
// 볼 수 없는 인벤토리(비공개 · 지워짐 · 없음)를 주소로 열면 404 대신 그 사람 프로필로 보내고 토스트 한 번 (무늬 빈화면프로필설계 v01 7절)
export default async function OtherInventoryPage(props: PageProps<"/u/[handle]/inventories/[id]">) {
  const { handle, id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();
  const loaded = await loadOtherProfile(handle, inventoryPath(id));
  const { viewer, person, blocked } = loaded;
  const searchParams = await props.searchParams;

  const [inventory, inventories] = await Promise.all([getVisibleInventoryDetail(person.id, id), getVisibleInventories(person.id)]);
  if (!inventory) redirect(`${profilePath(handle)}?notice=hidden`);
  const view: InventoryView = searchParams.view === "list" ? "list" : "grid";

  return (
    <ProfileShell {...otherShellProps(loaded)} tab="inventory">
      <ProfileInventoryScreen
        mine={false}
        handle={person.handle}
        nickname={person.nickname}
        blocked={blocked}
        inventories={inventories}
        inventory={inventory}
        view={view}
        category={typeof searchParams.category === "string" ? searchParams.category : null}
        columns={viewer ? toGridColumns(viewer.grid_columns) : DEFAULT_GRID_COLUMNS}
      />
    </ProfileShell>
  );
}
