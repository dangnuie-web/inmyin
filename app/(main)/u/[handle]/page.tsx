import type { Metadata } from "next";
import { ProfileInventoryScreen } from "@/components/inventory/ProfileInventoryScreen";
import { DEFAULT_GRID_COLUMNS, toGridColumns } from "@/components/inventory/Slot";
import { HiddenNotice } from "@/components/profile/HiddenNotice";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { loadOtherProfile, otherShellProps } from "@/components/profile/ProfileShells";
import { getVisibleInventories, getVisibleInventoryDetail } from "@/lib/profile/public-queries";

export const metadata: Metadata = { title: "프로필 · INMYIN" };

// H-06 · 타유저 프로필 = 그 사람의 프로필 첫 화면. 내 프로필(M-01)과 같은 틀 — 위쪽 버튼이 팔로우 · 프로필 공유이고,
// 띠 · 격자에는 공개된 것만(DB 규칙이 비공개를 뺀다). 처음 고른 인벤토리 = 공개된 것 중 순서 1번 — 주인이 맨 앞에 둔 것이 대표 (무늬 빈화면프로필설계 v01 2-2)
export default async function OtherProfilePage(props: PageProps<"/u/[handle]">) {
  const { handle } = await props.params;
  const loaded = await loadOtherProfile(handle, "/my");
  const { viewer, person, blocked } = loaded;
  const inventories = await getVisibleInventories(person.id);
  const inventory = inventories[0] ? await getVisibleInventoryDetail(person.id, inventories[0].id) : null;

  return (
    <ProfileShell {...otherShellProps(loaded)} tab="inventory">
      <ProfileInventoryScreen
        mine={false}
        handle={person.handle}
        nickname={person.nickname}
        blocked={blocked}
        inventories={inventories}
        inventory={inventory}
        view="grid"
        category={null}
        columns={viewer ? toGridColumns(viewer.grid_columns) : DEFAULT_GRID_COLUMNS}
      />
      <HiddenNotice />
    </ProfileShell>
  );
}
