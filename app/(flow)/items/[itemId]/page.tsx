import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { gridColumnsClass, gridFor, SlotCell, toGridColumns } from "@/components/inventory/Slot";
import { ItemMenu } from "@/components/item/ItemMenu";
import { LikeButton } from "@/components/like/LikeButton";
import { SoonButton } from "@/components/profile/SoonButton";
import { BackHeader } from "@/components/ui/BackHeader";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { TabIcon } from "@/components/ui/TabIcon";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPath, itemPath } from "@/lib/inventory/paths";
import { getMyInventoryDetail, type SlotEntry } from "@/lib/inventory/queries";
import { getItemDetail, getPublicItemFeed, getVisibleInventoryEntries } from "@/lib/item/queries";
import { formatShortDate } from "@/lib/item/rules";
import { hasLiked } from "@/lib/like/queries";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// 홈에서 왔을 때 아래에 이어 보여줄 "근처 아이템" 수
const NEARBY_COUNT = 12;

// 아이템 상세. 어디서 왔는지로 모양이 정해진다:
//   내 인벤토리(M-04)에서 온 내 아이템 = M-14 — 닫으면 그 인벤토리로, ⋮ 메뉴로 수정 · 삭제, 아래는 같은 인벤토리의 칸들
//   홈 피드(H-01)에서 왔거나 남의 아이템 = H-02 — 작성자 줄 · 팔로우 · 하트, 아래는 피드에서 근처에 있던 것들(홈에서 왔을 때).
//   홈에서 연 내 아이템도 남의 것과 똑같이 보인다 — 내가 올린 것이 남에게 어떻게 보이는지 그대로 보려고
// 주소는 둘 다 /items/[id]. 하단 탭이 없는 화면이라 (flow) 묶음에 둔다
export default async function ItemDetailPage(props: PageProps<"/items/[itemId]">) {
  const profile = await requireProfile();
  const { itemId } = await props.params;
  if (!UUID_PATTERN.test(itemId)) notFound();
  const searchParams = await props.searchParams;
  const fromHome = searchParams.from === "home";
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const category = typeof searchParams.category === "string" && searchParams.category ? searchParams.category : null;

  // 남의 비공개 아이템은 DB 규칙(RLS)이 애초에 돌려주지 않아서 여기서 없는 것이 된다
  const item = await getItemDetail(itemId);
  if (!item) notFound();
  const isMine = item.owner.id === profile.id;
  const asOwner = isMine && !fromHome;

  const facts = [
    { label: "획득날짜", value: item.acquiredNote },
    { label: "유통기한", value: item.expiresAt && `${formatShortDate(item.expiresAt)} 까지` },
  ].filter((fact) => fact.value);

  // ---- 내 인벤토리에서 온 내 아이템 (M-14) ----
  if (asOwner) {
    const inventory = await getMyInventoryDetail(profile.id, item.inventoryId);
    if (!inventory) notFound();
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <HeaderMini icon="close" href={inventoryPath(inventory.id)} title="아이템" action={<ItemMenu itemId={item.id} inventoryId={item.inventoryId} />} />
        <Photo item={item} className="mx-5 mt-3 bg-gray-1" />
        <section className="mt-10 px-5">
          <h2 className="text-title font-bold">{item.name}</h2>
          <Description item={item} facts={facts} />
        </section>
        <Grid entries={inventory.entries} currentId={item.id} className={gridFor(inventory.slotCount, toGridColumns(profile.grid_columns)).className} />
      </main>
    );
  }

  // ---- 홈에서 왔거나 남의 아이템 (H-02) ----
  // 아래에 이어 보여줄 것: 홈에서 왔으면 피드에서 이 아이템 다음에 있던 것들(같은 검색어 · 카테고리), 아니면 그 사람 인벤토리의 공개 아이템
  const [nearby, liked] = await Promise.all([
    fromHome
      ? getPublicItemFeed({ q, category: category ?? undefined, before: item.createdAt, limit: NEARBY_COUNT }).then((feedItems) =>
          feedItems.map((feedItem): SlotEntry => ({ kind: "item", deleted: false, ...feedItem })),
        )
      : getVisibleInventoryEntries(item.inventoryId),
    hasLiked(profile.id, "item", item.id),
  ]);
  const hrefFor = (entry: SlotEntry) => (fromHome ? itemPath(entry.id, { from: "home", q, category }) : undefined);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {/* 피드 · 프로필 등 어디서든 올 수 있어서 왔던 곳으로 돌아간다. 수정 · 삭제 메뉴는 없다 */}
      <BackHeader icon="close" title="아이템" />

      {/* 작성자 줄 (피그마 H-02). 타유저 프로필(H-06)을 만들면 누르면 거기로 간다. 팔로우는 그 항목에서 동작을 붙인다 */}
      <div className="mt-4 flex items-center gap-5 px-5">
        <span className="relative flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-2 text-disabled">
          {item.owner.avatarUrl ? (
            <Image src={item.owner.avatarUrl} alt="" fill sizes="72px" unoptimized className="object-cover" />
          ) : (
            <span className="scale-75">
              <TabIcon name="my" active />
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-body font-bold">{item.owner.nickname}</span>
          {/* 등록한 날. 서버는 UTC 로 주므로 한국 날짜로 바꿔서 26.09.05 꼴로 */}
          <span className="text-body">{formatShortDate(new Date(item.createdAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }))}</span>
        </span>
        {!isMine && (
          <SoonButton notice="팔로우는 곧 만들어요." className="h-8 shrink-0 rounded-sm bg-ink px-3.5 text-label font-bold text-white active:opacity-80">
            팔로우
          </SoonButton>
        )}
      </div>

      {/* 피그마 H-02: 흰 바탕에 옅은 테두리 */}
      <Photo item={item} className="mx-5 mt-5 border border-border bg-white" />

      <section className="mt-6 px-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 truncate text-title font-bold">{item.name}</h2>
          {/* 북마크는 없다 — 좋아요 하나뿐 (CLAUDE.md) */}
          <LikeButton targetType="item" targetId={item.id} liked={liked} count={item.likeCount} />
        </div>
        <Description item={item} facts={facts} />
      </section>

      {nearby.length > 0 && <Grid entries={nearby} currentId={item.id} hrefFor={hrefFor} className={gridColumnsClass(toGridColumns(profile.grid_columns))} />}
    </main>
  );
}

type Item = NonNullable<Awaited<ReturnType<typeof getItemDetail>>>;
type Fact = { label: string; value: string | null };

// 큰 정사각형 사진. 개수가 둘 이상이면 오른쪽 아래에 × n
function Photo({ item, className }: { item: Item; className: string }) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded-lg ${className}`}>
      {/* 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다 */}
      <Image src={item.imageUrl} alt={item.name} fill sizes="(min-width: 448px) 400px, 90vw" unoptimized priority className="object-cover" />
      {item.quantity > 1 && (
        <span className="absolute bottom-5.5 right-5 rounded-full bg-white px-3 text-link font-bold">× {item.quantity}</span>
      )}
    </div>
  );
}

function Description({ item, facts }: { item: Item; facts: Fact[] }) {
  return (
    <>
      {item.description && <p className="mt-4 whitespace-pre-line break-keep text-label">{item.description}</p>}
      {facts.length > 0 && (
        <dl className="mt-5 flex flex-col gap-1 pl-2.5 text-body">
          {facts.map(({ label, value }) => (
            <div key={label} className="flex gap-7">
              <dt className="font-bold before:mr-3.5 before:content-['•']">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}

// 아래의 칸들. 지금 보고 있는 아이템에는 검은 테두리, 다른 칸을 누르면 그 아이템으로 건너간다
function Grid({ entries, currentId, hrefFor, className }: { entries: SlotEntry[]; currentId: string; hrefFor?: (entry: SlotEntry) => string | undefined; className: string }) {
  return (
    <ul className={`mt-16 grid gap-3.5 px-5 ${className}`}>
      {entries.map((entry) => (
        <li key={entry.id}>
          <SlotCell entry={entry} current={entry.id === currentId} href={hrefFor?.(entry)} />
        </li>
      ))}
    </ul>
  );
}
