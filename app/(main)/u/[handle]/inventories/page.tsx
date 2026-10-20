import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VisibleInventoryList } from "@/components/inventory/VisibleInventoryList";
import { OtherProfileActions, OtherProfileCorner } from "@/components/profile/OtherProfileActions";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { getViewer } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { hasBlocked } from "@/lib/block/queries";
import { isFollowing } from "@/lib/follow/queries";
import { getPublicProfile, getVisibleInventories } from "@/lib/profile/public-queries";
import { StickyTop } from "@/components/ui/StickyTop";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

// H-07 · 타유저의 인벤토리 목록. 폰은 헤더 아래 목록, 웹은 프로필 틀의 인벤토리 탭 안에. 비공개 인벤토리는 DB 규칙이 뺀다
export default async function OtherInventoriesPage(props: PageProps<"/u/[handle]/inventories">) {
  // 로그인 없이도 열린다 (구경) — 그때는 팔로우를 누르면 로그인으로, ⋮(차단) 메뉴는 없다
  const profile = await getViewer();
  const { handle } = await props.params;
  if (!HANDLE_PATTERN.test(handle)) notFound();
  if (handle === profile?.handle) redirect("/my/inventories");

  const person = await getPublicProfile(handle);
  if (!person) notFound();
  const [inventories, following, blocked] = await Promise.all([getVisibleInventories(person.id), profile ? isFollowing(profile.id, person.id) : false, profile ? hasBlocked(profile.id, person.id) : false]);

  return (
    <ProfileShell
      person={person}
      mine={false}
      tab="inventory"
      corner={<OtherProfileCorner userId={person.id} blocked={blocked} guest={!profile} />}
      actions={<OtherProfileActions userId={person.id} handle={person.handle} nickname={person.nickname} following={following} blocked={blocked} guest={!profile} />}
    >
      <StickyTop phoneOnly>
        <BackHeader title="인벤토리" />
      </StickyTop>
      <VisibleInventoryList handle={handle} inventories={inventories} />
    </ProfileShell>
  );
}
