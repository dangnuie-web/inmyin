import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { VisibleInventoryList } from "@/components/inventory/VisibleInventoryList";
import { OtherProfileActions, OtherProfileCorner } from "@/components/profile/OtherProfileActions";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { hasBlocked } from "@/lib/block/queries";
import { isFollowing } from "@/lib/follow/queries";
import { getPublicProfile, getVisibleInventories } from "@/lib/profile/public-queries";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

// H-07 · 타유저의 인벤토리 목록. 폰은 헤더 아래 목록, 웹은 프로필 틀의 INVENTORY 탭 안에. 비공개 인벤토리는 DB 규칙이 뺀다
export default async function OtherInventoriesPage(props: PageProps<"/u/[handle]/inventories">) {
  const profile = await requireProfile();
  const { handle } = await props.params;
  if (!HANDLE_PATTERN.test(handle)) notFound();
  if (handle === profile.handle) redirect("/my/inventories");

  const person = await getPublicProfile(handle);
  if (!person) notFound();
  const [inventories, following, blocked] = await Promise.all([getVisibleInventories(person.id), isFollowing(profile.id, person.id), hasBlocked(profile.id, person.id)]);

  return (
    <ProfileShell
      person={person}
      mine={false}
      tab="inventory"
      corner={<OtherProfileCorner userId={person.id} blocked={blocked} />}
      actions={<OtherProfileActions userId={person.id} following={following} blocked={blocked} />}
    >
      <div className="lg:hidden">
        <BackHeader title="INVENTORY" />
      </div>
      <VisibleInventoryList handle={handle} inventories={inventories} />
    </ProfileShell>
  );
}
