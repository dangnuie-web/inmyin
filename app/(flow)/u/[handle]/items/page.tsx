import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DEFAULT_GRID_COLUMNS, toGridColumns } from "@/components/inventory/Slot";
import { ItemCollection } from "@/components/item/ItemCollection";
import { OtherProfileActions, OtherProfileCorner } from "@/components/profile/OtherProfileActions";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { getViewer } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { hasBlocked } from "@/lib/block/queries";
import { isFollowing } from "@/lib/follow/queries";
import { getPublicProfile, getVisibleItemCollection } from "@/lib/profile/public-queries";
import { StickyTop } from "@/components/ui/StickyTop";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

// 타유저의 아이템 모아보기. 내 것(M-13)과 같은 화면이고 보이는 아이템만 온다. 웹은 프로필 틀의 ITEM 탭 안에. 아래 숫자는 보이는 아이템 수
export default async function OtherItemsPage(props: PageProps<"/u/[handle]/items">) {
  // 로그인 없이도 열린다 (구경) — 그때는 팔로우를 누르면 로그인으로, ⋮(차단) 메뉴는 없다
  const profile = await getViewer();
  const { handle } = await props.params;
  if (!HANDLE_PATTERN.test(handle)) notFound();
  if (handle === profile?.handle) redirect("/my/items");

  const person = await getPublicProfile(handle);
  if (!person) notFound();
  const [items, following, blocked] = await Promise.all([getVisibleItemCollection(person.id), profile ? isFollowing(profile.id, person.id) : false, profile ? hasBlocked(profile.id, person.id) : false]);

  return (
    <ProfileShell
      person={person}
      mine={false}
      tab="items"
      corner={<OtherProfileCorner userId={person.id} blocked={blocked} guest={!profile} />}
      actions={<OtherProfileActions userId={person.id} handle={person.handle} nickname={person.nickname} following={following} blocked={blocked} guest={!profile} />}
    >
      <StickyTop phoneOnly>
        <BackHeader title="아이템" />
      </StickyTop>
      <main className="flex flex-1 flex-col lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pt-6 lg:pb-4">
        <ItemCollection items={items} capacity={null} columns={profile ? toGridColumns(profile.grid_columns) : DEFAULT_GRID_COLUMNS} emptyText="공개된 아이템이 아직 없어요." />
      </main>
    </ProfileShell>
  );
}
