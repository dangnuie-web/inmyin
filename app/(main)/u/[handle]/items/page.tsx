import type { Metadata } from "next";
import { DEFAULT_GRID_COLUMNS, toGridColumns } from "@/components/inventory/Slot";
import { ItemCollection } from "@/components/item/ItemCollection";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { loadOtherProfile, otherShellProps } from "@/components/profile/ProfileShells";
import { EmptyLine } from "@/components/ui/EmptyBag";
import { getVisibleItemCollection } from "@/lib/profile/public-queries";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

// 타유저 프로필 › 아이템 탭. 내 것(M-13)과 같은 화면이고 보이는 아이템만 온다. 목록 위 숫자는 보이는 아이템 수
export default async function OtherItemsPage(props: PageProps<"/u/[handle]/items">) {
  const { handle } = await props.params;
  const loaded = await loadOtherProfile(handle, "/my/items");
  const { viewer, person, blocked } = loaded;
  const items = blocked ? [] : await getVisibleItemCollection(person.id);

  return (
    <ProfileShell {...otherShellProps(loaded)} tab="items">
      <div className="flex flex-1 flex-col pt-5 lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pt-6 lg:pb-4">
        {blocked ? (
          // 비어 있는 게 아니라 가린 것 — 가방 없이 글 한 줄
          <EmptyLine>차단한 사용자예요. 차단을 풀면 다시 볼 수 있어요.</EmptyLine>
        ) : (
          <ItemCollection items={items} capacity={null} columns={viewer ? toGridColumns(viewer.grid_columns) : DEFAULT_GRID_COLUMNS} empty={{ text: "공개된 아이템이 아직 없어요." }} />
        )}
      </div>
    </ProfileShell>
  );
}
