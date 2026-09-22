import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { gridColumnsClass, gridFor, SlotCell, toGridColumns } from "@/components/inventory/Slot";
import { ItemMenu } from "@/components/item/ItemMenu";
import { BackHeader } from "@/components/ui/BackHeader";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { TabIcon } from "@/components/ui/TabIcon";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPath } from "@/lib/inventory/paths";
import { getMyInventoryDetail, type SlotEntry } from "@/lib/inventory/queries";
import { getItemDetail, getVisibleInventoryEntries } from "@/lib/item/queries";
import { formatShortDate } from "@/lib/item/rules";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 아이템 상세. 내 것이면 M-14 (인벤토리의 칸에서 온다, ⋮ 메뉴로 수정 · 삭제), 남의 공개 아이템이면 H-02 (피드에서 온다, 작성자 줄).
// 주소는 둘 다 /items/[id] — 누구 것인지는 열어 보고 안다. 하단 탭이 없는 화면이라 (flow) 묶음에 둔다.
// 아래에는 같은 인벤토리의 칸들이 이어져서, 눌러서 옆의 아이템으로 건너갈 수 있다. 남의 것이면 공개 아이템만 당겨 붙여 보인다
export default async function ItemDetailPage(props: PageProps<"/items/[itemId]">) {
  const profile = await requireProfile();
  const { itemId } = await props.params;
  if (!UUID_PATTERN.test(itemId)) notFound();

  // 남의 비공개 아이템은 DB 규칙(RLS)이 애초에 돌려주지 않아서 여기서 없는 것이 된다
  const item = await getItemDetail(itemId);
  if (!item) notFound();
  const isMine = item.owner.id === profile.id;

  // 내 것이면 인벤토리의 칸 전부(담긴 인벤토리 포함), 남의 것이면 그 인벤토리에서 보이는 아이템만
  let entries: SlotEntry[];
  let gridClass: string;
  let closeHref: string | null = null;
  if (isMine) {
    const inventory = await getMyInventoryDetail(profile.id, item.inventoryId);
    if (!inventory) notFound();
    entries = inventory.entries;
    gridClass = gridFor(inventory.slotCount, toGridColumns(profile.grid_columns)).className;
    closeHref = inventoryPath(inventory.id);
  } else {
    entries = await getVisibleInventoryEntries(item.inventoryId);
    gridClass = gridColumnsClass(toGridColumns(profile.grid_columns));
  }

  const facts = [
    { label: "획득날짜", value: item.acquiredNote },
    { label: "유통기한", value: item.expiresAt && `${formatShortDate(item.expiresAt)} 까지` },
  ].filter((fact) => fact.value);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {closeHref ? (
        <HeaderMini icon="close" href={closeHref} title="아이템" action={<ItemMenu itemId={item.id} inventoryId={item.inventoryId} />} />
      ) : (
        // 남의 것은 피드 · 프로필 등 어디서든 올 수 있어서 왔던 곳으로 돌아간다. 수정 · 삭제 메뉴는 없다
        <BackHeader icon="close" title="아이템" />
      )}

      <div className="relative mx-5 mt-3 aspect-square overflow-hidden rounded-lg bg-gray-1">
        {/* 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다 */}
        <Image src={item.imageUrl} alt={item.name} fill sizes="(min-width: 448px) 400px, 90vw" unoptimized priority className="object-cover" />
        {item.quantity > 1 && (
          <span className="absolute bottom-5.5 right-5 rounded-full bg-white px-3 text-link font-bold">× {item.quantity}</span>
        )}
      </div>

      {!isMine && (
        // 작성자 줄. 타유저 프로필(H-06)을 만들면 누르면 거기로 가게 한다
        <div className="mt-4 flex items-center gap-3 px-5">
          <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-2 text-disabled">
            {item.owner.avatarUrl ? (
              <Image src={item.owner.avatarUrl} alt="" fill sizes="36px" unoptimized className="object-cover" />
            ) : (
              <span className="scale-50">
                <TabIcon name="my" active />
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-label font-bold">{item.owner.nickname}</span>
            <span className="truncate text-caption text-ink-muted">@{item.owner.handle}</span>
          </span>
        </div>
      )}

      <section className={`px-5 ${isMine ? "mt-10" : "mt-6"}`}>
        <h2 className="text-title font-bold">{item.name}</h2>
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
      </section>

      <ul className={`mt-16 grid gap-3.5 px-5 ${gridClass}`}>
        {entries.map((entry) => (
          <li key={entry.id}>
            <SlotCell entry={entry} current={entry.id === item.id} />
          </li>
        ))}
      </ul>
    </main>
  );
}
