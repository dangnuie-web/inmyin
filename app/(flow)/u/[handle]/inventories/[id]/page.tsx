import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { InventoryStrip } from "@/components/inventory/InventoryStrip";
import { gridFor, SlotCell, SlotRow, toGridColumns } from "@/components/inventory/Slot";
import { ViewToggle } from "@/components/inventory/ViewToggle";
import { OtherProfileActions, OtherProfileCorner } from "@/components/profile/OtherProfileActions";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ChipRow } from "@/components/ui/ChipRow";
import { requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { hasBlocked } from "@/lib/block/queries";
import { isFollowing } from "@/lib/follow/queries";
import { inventoryPath, itemPath, type InventoryView } from "@/lib/inventory/paths";
import type { SlotEntry } from "@/lib/inventory/queries";
import { otherInventoryPath } from "@/lib/profile/paths";
import { getPublicProfile, getVisibleInventories, getVisibleInventoryDetail } from "@/lib/profile/public-queries";

export const metadata: Metadata = { title: "인벤토리 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// H-08 · 타유저의 인벤토리 상세. 내 인벤토리(M-04)와 같은 틀 — 띠 · 토글 · 칩 · 격자/리스트 · 아래 숫자 —
// 이지만 + 칸 · 길게 누르기 · 밀기 · 짐싸기가 없다. 비공개 아이템은 칸째로 빠지고 나머지가 당겨 붙는다 (DB 규칙).
// 칸을 누르면 아이템은 상세(H-02 모양), 담긴 인벤토리는 그 인벤토리(이 화면)
export default async function OtherInventoryPage(props: PageProps<"/u/[handle]/inventories/[id]">) {
  const profile = await requireProfile();
  const { handle, id } = await props.params;
  if (!HANDLE_PATTERN.test(handle) || !UUID_PATTERN.test(id)) notFound();
  if (handle === profile.handle) redirect(inventoryPath(id));
  const searchParams = await props.searchParams;

  const person = await getPublicProfile(handle);
  if (!person) notFound();
  const [inventory, inventories, following, blocked] = await Promise.all([
    getVisibleInventoryDetail(person.id, id),
    getVisibleInventories(person.id),
    isFollowing(profile.id, person.id),
    hasBlocked(profile.id, person.id),
  ]);
  if (!inventory) notFound();

  const view: InventoryView = searchParams.view === "list" ? "list" : "grid";
  // 주소에 적힌 카테고리가 이 인벤토리의 태그일 때만 거른다. 아니면 전체
  const category = typeof searchParams.category === "string" && inventory.categories.includes(searchParams.category) ? searchParams.category : null;
  // 태그가 없는 아이템은 전체에서만 보인다 (CLAUDE.md 규칙 4)
  const entries = category ? inventory.entries.filter((entry) => entry.category === category) : inventory.entries;
  const hrefFor = (entry: SlotEntry) => (entry.kind === "item" ? itemPath(entry.id) : otherInventoryPath(handle, entry.id));

  return (
    // 폰은 헤더 아래 바로, 웹은 프로필 틀의 INVENTORY 탭 안의 회색 판 (피그마 H-08 웹)
    <ProfileShell
      person={person}
      mine={false}
      tab="inventory"
      corner={<OtherProfileCorner userId={person.id} blocked={blocked} />}
      actions={<OtherProfileActions userId={person.id} handle={person.handle} nickname={person.nickname} following={following} blocked={blocked} />}
    >
      <div className="lg:hidden">
        <BackHeader title="INVENTORY" />
      </div>
      <main className="flex flex-1 flex-col lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pb-4">
      <div className="mt-5">
        <InventoryStrip inventories={inventories} currentId={inventory.id} hrefFor={(inventoryId) => otherInventoryPath(handle, inventoryId, { view })} />
      </div>

      <div className="mt-9 flex items-center gap-2.5 pl-5">
        <ViewToggle current={view} hrefFor={(next) => otherInventoryPath(handle, id, { view: next, category })} />
        <ChipRow className="min-w-0 flex-1">
          <CategoryTag label="전체" selected={!category} href={otherInventoryPath(handle, id, { view })} />
          {inventory.categories.map((tag) => (
            <CategoryTag key={tag} label={tag} selected={tag === category} href={otherInventoryPath(handle, id, { view, category: tag })} />
          ))}
        </ChipRow>
      </div>

      {entries.length === 0 ? (
        <p className="mt-16 break-keep px-5 text-center text-label text-ink-muted">{category ? "이 카테고리에는 아직 없어요." : "공개된 아이템이 아직 없어요."}</p>
      ) : view === "grid" ? (
        <ul className={`mt-6 grid gap-3.5 px-5 lg:grid-cols-7 ${gridFor(inventory.slotCount, toGridColumns(profile.grid_columns)).className}`}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <SlotCell entry={entry} href={hrefFor(entry)} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-5 flex flex-col border-t border-border">
          {entries.map((entry) => (
            <li key={entry.id}>
              <SlotRow entry={entry} href={hrefFor(entry)} />
            </li>
          ))}
        </ul>
      )}

      {/* 화면 아래에 붙어 있는 숫자 — 보이는 것 / 칸 수 */}
      <div className="pointer-events-none sticky bottom-0 mt-auto flex h-19 items-center justify-center pb-[env(safe-area-inset-bottom)]">
        <p className="rounded-full bg-white px-3 py-0.5 text-label font-bold">
          {inventory.entries.length}/{inventory.slotCount}
        </p>
      </div>
      </main>
    </ProfileShell>
  );
}
