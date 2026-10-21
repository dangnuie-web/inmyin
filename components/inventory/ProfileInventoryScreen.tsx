import { InstallGuideAuto } from "@/components/InstallGuide";
import { EmptyBag, EmptyLine } from "@/components/ui/EmptyBag";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ChipRow } from "@/components/ui/ChipRow";
import { inventoryPath, itemPath, type InventoryView } from "@/lib/inventory/paths";
import type { InventoryDetail, InventorySummary, SlotEntry } from "@/lib/inventory/queries";
import { otherInventoryPath } from "@/lib/profile/paths";
import { AddInventoryTile } from "./AddInventoryRow";
import { InventoryBoard } from "./InventoryBoard";
import { InventoryStrip } from "./InventoryStrip";
import { InventoryTitleRow } from "./InventoryTitleRow";
import { NoInventoryEmpty } from "./NoInventoryEmpty";
import { RememberInventory } from "./RememberInventory";
import { type GridColumns, gridFor, SlotCell, SlotRow } from "./Slot";
import { ViewToggle } from "./ViewToggle";

type Common = {
  // 띠에 놓일 것. 순서(sort_order)대로. 남의 것은 DB 규칙이 비공개를 뺀 것
  inventories: InventorySummary[];
  // 고른 인벤토리. 인벤토리가 하나도 없으면 null
  inventory: InventoryDetail | null;
  view: InventoryView;
  // 주소의 ?category= (이 인벤토리의 태그가 아니면 부르는 쪽이 아니라 여기서 무시한다)
  category: string | null;
  columns: GridColumns;
};

type ProfileInventoryScreenProps =
  | (Common & {
      mine: true;
      // 방금 등록한 · 방금 지운 아이템 (?added= · ?deleted=)
      addedId: string | null;
      deletedId: string | null;
      // 플랜의 인벤토리 한도. 닿으면 띠의 + 칸이 없다 (관리 화면에 "인벤토리 늘리기"가 있다)
      maxInventories: number;
    })
  | (Common & {
      mine: false;
      handle: string;
      nickname: string;
      // 내가 차단한 사람 — 비어 있는 게 아니라 가린 것이라 가방 없이 글 한 줄
      blocked: boolean;
    });

// 프로필 › 인벤토리 탭 = 프로필 첫 화면 (무늬 빈화면프로필설계 v01 2 · 3절, 피그마 M-04 웹).
// 띠(썸네일 + 이름) → 이름 줄 "데스크 10/25 [관리][짐싸기]" → 토글 · 칩 → 격자. 비었으면 빈 가방.
// 내 프로필(/my · /my/inventories/[id])과 남의 프로필(/u/[handle] · /u/[handle]/inventories/[id]) 네 화면이 같이 쓴다.
// 폰은 탭 줄 아래 바로, 웹은 회색 판 안
export function ProfileInventoryScreen(props: ProfileInventoryScreenProps) {
  const { inventories, inventory, view, columns } = props;

  if (!props.mine && props.blocked) return <EmptyLine>차단한 사용자예요. 차단을 풀면 다시 볼 수 있어요.</EmptyLine>;
  if (!inventory) {
    return props.mine ? <NoInventoryEmpty /> : <EmptyBag>공개된 인벤토리가 아직 없어요.</EmptyBag>;
  }

  // 주소에 적힌 카테고리가 이 인벤토리의 태그일 때만 거른다. 아니면 전체
  const category = props.category && inventory.categories.includes(props.category) ? props.category : null;
  // 태그가 없는 아이템은 전체에서만 보인다 (CLAUDE.md 규칙 4)
  const entries = category ? inventory.entries.filter((entry) => entry.category === category) : inventory.entries;
  const pathFor = (inventoryId: string, options: { view?: InventoryView; category?: string | null } = {}) =>
    props.mine ? inventoryPath(inventoryId, options) : otherInventoryPath(props.handle, inventoryId, options);

  // 토글은 제자리에 있고, 칩만 그 오른쪽에서 옆으로 넘어간다 — 칩을 넘겨 본 뒤에도 보기 방식을 바로 바꿀 수 있다
  const controls = (
    <div className="mt-4 flex items-center gap-2.5 pl-5">
      <ViewToggle current={view} hrefFor={(next) => pathFor(inventory.id, { view: next, category })} />
      <ChipRow className="min-w-0 flex-1">
        <CategoryTag label="전체" selected={!category} href={pathFor(inventory.id, { view })} />
        {inventory.categories.map((tag) => (
          <CategoryTag key={tag} label={tag} selected={tag === category} href={pathFor(inventory.id, { view, category: tag })} />
        ))}
      </ChipRow>
    </div>
  );

  return (
    <>
      {/* 띠 · 토글 · 칩을 누르면 답이 올 때까지 아래 판이 흐려진다 (components/ui/LinkPending.tsx) */}
      <div data-pending-scope="board" className="flex flex-1 flex-col lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pb-4">
        <div className="pt-5">
          <InventoryStrip
            inventories={inventories}
            currentId={inventory.id}
            named
            label={props.mine ? "내 인벤토리" : `${props.nickname}의 인벤토리`}
            hrefFor={(inventoryId) => pathFor(inventoryId, { view })}
            trailing={props.mine && inventories.length < props.maxInventories ? <AddInventoryTile /> : undefined}
          />
        </div>

        <div data-pending-body="board" className="flex flex-1 flex-col">
          {props.mine ? (
            <>
              {/* 연 인벤토리를 "마지막에 연 것"으로 적어 둔다 — 하단 탭 + 와 다음에 여는 /my 가 이것을 쓴다 */}
              <RememberInventory id={inventory.id} />
              <InventoryBoard
                inventoryId={inventory.id}
                name={inventory.name}
                isPublic={inventory.isPublic}
                needsCategory={inventory.category === null}
                controls={controls}
                filtered={category !== null}
                inventories={inventories}
                addedId={props.addedId}
                deletedId={props.deletedId}
                entries={entries}
                usedSlots={inventory.entries.filter((entry) => !entry.deleted).length}
                slotCount={inventory.slotCount}
                view={view}
                columns={columns}
              />
            </>
          ) : (
            <OtherBoard handle={props.handle} inventory={inventory} entries={entries} filtered={category !== null} controls={controls} view={view} columns={columns} />
          )}
        </div>
      </div>
      {/* 아이템을 저장하고 돌아온 직후 "홈 화면에 INMYIN을 꽂아 두세요" (자동 최대 2번, 규칙은 lib/install-guide.ts) */}
      {props.mine && <InstallGuideAuto addedId={props.addedId} />}
    </>
  );
}

// 남의 인벤토리 (H-08) — 내 것과 같은 틀이지만 + 칸 · 길게 누르기 · 밀기 · 버튼이 없다.
// 비공개 아이템 · 인벤토리는 칸째로 빠지고 나머지가 당겨 붙는다 (DB 규칙). 칸을 누르면 아이템은 상세, 담긴 인벤토리는 그 인벤토리
function OtherBoard({ handle, inventory, entries, filtered, controls, view, columns }: { handle: string; inventory: InventoryDetail; entries: SlotEntry[]; filtered: boolean; controls: React.ReactNode; view: InventoryView; columns: GridColumns }) {
  const hrefFor = (entry: SlotEntry) => (entry.kind === "item" ? itemPath(entry.id) : otherInventoryPath(handle, entry.id));
  return (
    <div className="flex flex-1 flex-col pb-10 lg:pb-0">
      {/* 숫자는 보이는 것 / 칸 수 */}
      <InventoryTitleRow name={inventory.name} note={`${inventory.entries.length}/${inventory.slotCount}`} />
      {controls}
      {entries.length === 0 ? (
        filtered ? <EmptyLine>이 카테고리에는 아직 없어요.</EmptyLine> : <EmptyBag>공개된 아이템이 아직 없어요.</EmptyBag>
      ) : view === "grid" ? (
        <ul className={`mt-6 grid gap-3.5 px-5 lg:grid-cols-7 xl:grid-cols-8 ${gridFor(inventory.slotCount, columns).className}`}>
          {entries.map((entry) => (
            <li key={entry.id}>
              <SlotCell entry={entry} href={hrefFor(entry)} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-3 flex flex-col border-t border-border">
          {entries.map((entry) => (
            <li key={entry.id}>
              <SlotRow entry={entry} href={hrefFor(entry)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
