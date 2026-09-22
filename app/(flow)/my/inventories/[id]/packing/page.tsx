import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackingBoard } from "@/components/inventory/PackingBoard";
import { toGridColumns } from "@/components/inventory/Slot";
import Link from "next/link";
import { PROFILE_ACTION_CLASS } from "@/components/profile/ProfileParts";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { SoonButton } from "@/components/profile/SoonButton";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPath } from "@/lib/inventory/paths";
import { getMyPackingInventories } from "@/lib/inventory/queries";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "짐싸기 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-05 · 짐싸기. 인벤토리 상세(M-04)의 짐싸기 버튼에서 온다. 그 인벤토리가 위쪽에, 다른 하나가 아래쪽에 열린다.
// 화면 높이를 딱 반씩 나눠 쓰고, 칸이 많으면 각 절반 안에서만 스크롤한다
export default async function PackingPage(props: PageProps<"/my/inventories/[id]/packing">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();

  const [inventories, stats] = await Promise.all([getMyPackingInventories(profile.id), getMyProfileStats(profile.id)]);
  if (!inventories.some((inventory) => inventory.id === id)) notFound();

  return (
    // 폰은 화면 높이를 반씩 나눠 쓰고, 웹(피그마 M-05)은 프로필 틀 안에 두 판을 나란히 + 오른쪽 위 "완료"
    <ProfileShell
      person={{ ...profile, avatarUrl: profile.avatar_url, followerCount: stats.followerCount, followingCount: stats.followingCount }}
      mine
      tab="inventory"
      corner={
        <Link href="/my/settings" aria-label="설정" className="active:opacity-60">
          <Icon name="settings" scale={0.5} />
        </Link>
      }
      actions={
        <>
          <Link href="/my/edit" className={PROFILE_ACTION_CLASS}>
            프로필 관리
          </Link>
          <SoonButton notice="프로필 공유는 곧 만들어요." className={PROFILE_ACTION_CLASS}>
            프로필 공유
          </SoonButton>
        </>
      }
    >
      <div className="hidden justify-end px-5 pt-4 lg:flex">
        <Link href={inventoryPath(id)} className="rounded-full border border-ink bg-white px-5 py-1 text-body font-bold active:opacity-60">
          완료
        </Link>
      </div>
      <main className="flex h-dvh flex-col pb-[env(safe-area-inset-bottom)] lg:h-auto lg:pb-10">
        <div className="lg:hidden">
          <HeaderMini icon="close" href={inventoryPath(id)} title="짐싸기" />
        </div>
        <PackingBoard inventories={inventories} startId={id} columns={toGridColumns(profile.grid_columns)} />
      </main>
    </ProfileShell>
  );
}
