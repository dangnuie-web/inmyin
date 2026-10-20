import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstallGuideAuto } from "@/components/InstallGuide";
import { InventoryBoard } from "@/components/inventory/InventoryBoard";
import { RememberInventory } from "@/components/inventory/RememberInventory";
import { toGridColumns } from "@/components/inventory/Slot";
import { InventoryStrip } from "@/components/inventory/InventoryStrip";
import { ViewToggle } from "@/components/inventory/ViewToggle";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ChipRow } from "@/components/ui/ChipRow";
import { MyProfileActions, MyProfileCorner } from "@/components/profile/MyProfileActions";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPath, packingPath, type InventoryView } from "@/lib/inventory/paths";
import { getMyInventories, getMyInventoryDetail } from "@/lib/inventory/queries";
import { getMyProfileStats } from "@/lib/profile/queries";
import { StickyTop } from "@/components/ui/StickyTop";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-04 · 프로필 › 인벤토리 상세. 하단 탭이 없는 화면이라 (flow) 묶음에 둔다.
export default async function InventoryDetailPage(props: PageProps<"/my/inventories/[id]">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  if (!UUID_PATTERN.test(id)) notFound();

  // 방금 지운 아이템. 제자리에 "되돌리기" 칸으로 잠깐 남긴다
  const deletedId =
    typeof searchParams.deleted === "string" && UUID_PATTERN.test(searchParams.deleted) ? searchParams.deleted : null;

  const [inventory, inventories, stats] = await Promise.all([
    getMyInventoryDetail(profile.id, id, deletedId),
    getMyInventories(profile.id),
    getMyProfileStats(profile.id),
  ]);
  if (!inventory) notFound();

  // 방금 저장한 아이템 (items/new/actions.ts 의 redirect). 그 칸을 알리고, 설치 안내를 띄울지 본다
  const addedId = typeof searchParams.added === "string" ? searchParams.added : null;

  const view: InventoryView = searchParams.view === "list" ? "list" : "grid";
  // 주소에 적힌 카테고리가 이 인벤토리의 태그일 때만 거른다. 아니면 전체
  const category =
    typeof searchParams.category === "string" && inventory.categories.includes(searchParams.category)
      ? searchParams.category
      : null;
  // 태그가 없는 아이템은 전체에서만 보인다 (CLAUDE.md 규칙 4)
  const entries = category ? inventory.entries.filter((entry) => entry.category === category) : inventory.entries;

  const packing = (
    <Link href={packingPath(inventory.id)} className="flex h-8 shrink-0 items-center justify-center rounded-sm border border-disabled bg-white px-3.5 text-label font-bold text-ink active:opacity-60">
      짐싸기
    </Link>
  );

  return (
    // 폰은 헤더 아래 바로, 웹은 프로필 틀의 인벤토리 탭 안의 회색 판 (피그마 M-04 웹)
    <ProfileShell
      person={{ ...profile, avatarUrl: profile.avatar_url, followerCount: stats.followerCount, followingCount: stats.followingCount }}
      mine
      tab="inventory"
      corner={<MyProfileCorner />}
      actions={<MyProfileActions handle={profile.handle} nickname={profile.nickname} />}
    >
      <RememberInventory id={inventory.id} />
      <StickyTop phoneOnly>
        <HeaderMini icon="back" href="/my/inventories" title="인벤토리" action={packing} />
      </StickyTop>
      <div className="hidden justify-end px-5 pt-4 lg:flex">{packing}</div>

      <main className="flex flex-1 flex-col lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pb-4">
      <div className="mt-5">
        <InventoryStrip inventories={inventories} currentId={inventory.id} hrefFor={(inventoryId) => inventoryPath(inventoryId, { view })} />
      </div>

      {/* 토글은 제자리에 있고, 칩만 그 오른쪽에서 옆으로 넘어간다 — 칩을 넘겨 본 뒤에도 보기 방식을 바로 바꿀 수 있다 */}
      <div className="mt-9 flex items-center gap-2.5 pl-5">
        <ViewToggle current={view} hrefFor={(next) => inventoryPath(inventory.id, { view: next, category })} />
        <ChipRow className="min-w-0 flex-1">
          <CategoryTag label="전체" selected={!category} href={inventoryPath(inventory.id, { view })} />
        {inventory.categories.map((tag) => (
          <CategoryTag
            key={tag}
            label={tag}
            selected={tag === category}
            href={inventoryPath(inventory.id, { view, category: tag })}
          />
        ))}
        </ChipRow>
      </div>

      <InventoryBoard
        inventoryId={inventory.id}
        inventories={inventories}
        addedId={addedId}
        deletedId={deletedId}
        entries={entries}
        usedSlots={inventory.entries.filter((entry) => !entry.deleted).length}
        slotCount={inventory.slotCount}
        view={view}
        columns={toGridColumns(profile.grid_columns)}
      />
      </main>
      {/* 아이템을 저장하고 돌아온 직후 "홈 화면에 INMYIN을 꽂아 두세요" (자동 최대 2번, 규칙은 lib/install-guide.ts) */}
      <InstallGuideAuto addedId={addedId} />
    </ProfileShell>
  );
}
