import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/item/ItemForm";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { addFlowCategory, inventoryPath } from "@/lib/inventory/paths";
import { getMyInventories, getMyItemStamps } from "@/lib/inventory/queries";
import { readLastInventoryId } from "@/lib/inventory/resolve-last-inventory";
import { chooseTarget, hasRoom } from "@/lib/inventory/target";

export const metadata: Metadata = { title: "아이템 넣기 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-08 · 아이템 정보 입력. 사진을 찍거나 고른 뒤(M-06 → M-07) 온다. 여기가 저장 단계라 맨 위 "넣을 곳"에서 인벤토리를 고른다
// (무늬 인벤토리고르기설계 v01 3-2). 주소의 [id] 는 "기본으로 골라 둘 곳" — 인벤토리 + 면 그 인벤토리, 하단 탭 + 면 /add 가 고른 곳.
// [id] 가 그사이 꽉 찼어도 돌려보내지 않는다(사진을 잃는다) — 빈 칸 있는 다른 곳을 골라 두고, 그것도 없으면 [id] 그대로(저장 버튼이 꺼진다)
export default async function NewItemPage(props: PageProps<"/my/inventories/[id]/items/new">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();

  const inventories = await getMyInventories(profile.id);
  const here = inventories.find((inventory) => inventory.id === id);
  if (!here) notFound();

  let initialId = id;
  if (!hasRoom(here)) {
    const [items, rememberedId] = await Promise.all([getMyItemStamps(profile.id), readLastInventoryId()]);
    initialId = chooseTarget({ inventories, items, rememberedId }) ?? id;
  }

  return (
    <main className="flex flex-1 flex-col bg-surface-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <HeaderMini icon="close" href={inventoryPath(id)} title="저장하기" tone="dark" />
        <ItemForm
          userId={profile.id}
          inventoryId={id}
          inventories={inventories}
          initialInventoryId={initialId}
          initialCategory={addFlowCategory((await props.searchParams).category)}
        />
      </div>
    </main>
  );
}
