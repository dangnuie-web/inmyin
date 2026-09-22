import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { gridFor, SlotCell, toGridColumns } from "@/components/inventory/Slot";
import { ItemMenu } from "@/components/item/ItemMenu";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { inventoryPath } from "@/lib/inventory/paths";
import { getMyInventoryDetail } from "@/lib/inventory/queries";
import { getMyItemDetail } from "@/lib/item/queries";
import { formatShortDate } from "@/lib/item/rules";

export const metadata: Metadata = { title: "아이템 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-14 · 아이템 상세. 인벤토리(M-04)의 칸을 누르면 온다. 하단 탭이 없는 화면이라 (flow) 묶음에 둔다.
// 아래에는 같은 인벤토리의 칸들이 이어져서, 눌러서 옆의 아이템으로 건너갈 수 있다.
export default async function ItemDetailPage(props: PageProps<"/items/[itemId]">) {
  const profile = await requireProfile();
  const { itemId } = await props.params;
  if (!UUID_PATTERN.test(itemId)) notFound();

  const item = await getMyItemDetail(profile.id, itemId);
  if (!item) notFound();
  const inventory = await getMyInventoryDetail(profile.id, item.inventoryId);
  if (!inventory) notFound();

  const facts = [
    { label: "획득날짜", value: item.acquiredNote },
    { label: "유통기한", value: item.expiresAt && `${formatShortDate(item.expiresAt)} 까지` },
  ].filter((fact) => fact.value);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <HeaderMini icon="close" href={inventoryPath(inventory.id)} title="아이템" action={<ItemMenu itemId={item.id} inventoryId={inventory.id} />} />

      <div className="relative mx-5 mt-3 aspect-square overflow-hidden rounded-lg bg-gray-1">
        {/* 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다 */}
        <Image src={item.imageUrl} alt={item.name} fill sizes="(min-width: 448px) 400px, 90vw" unoptimized priority className="object-cover" />
        {item.quantity > 1 && (
          <span className="absolute bottom-5.5 right-5 rounded-full bg-white px-3 text-link font-bold">× {item.quantity}</span>
        )}
      </div>

      <section className="mt-10 px-5">
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

      <ul className={`mt-16 grid gap-3.5 px-5 ${gridFor(inventory.slotCount, toGridColumns(profile.grid_columns)).className}`}>
        {inventory.entries.map((entry) => (
          <li key={entry.id}>
            <SlotCell entry={entry} current={entry.id === item.id} />
          </li>
        ))}
      </ul>
    </main>
  );
}
