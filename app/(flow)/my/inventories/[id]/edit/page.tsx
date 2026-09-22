import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getMyInventories, getMyInventoryDetail } from "@/lib/inventory/queries";

export const metadata: Metadata = { title: "인벤토리 수정 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 인벤토리 수정. 인벤토리 목록(M-03)의 줄을 오른쪽으로 밀면 온다. 만들 때와 같은 화면에 지금 값을 채워서 연다
export default async function InventoryUpdatePage(props: PageProps<"/my/inventories/[id]/edit">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();

  const [detail, inventories] = await Promise.all([getMyInventoryDetail(profile.id, id), getMyInventories(profile.id)]);
  const imageUrl = inventories.find((inventory) => inventory.id === id)?.imageUrl;
  if (!detail || !imageUrl) notFound();

  return (
    <main className="flex flex-1 flex-col bg-surface-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <HeaderMini icon="close" href="/my/inventories" title="수정하기" tone="dark" />
        <InventoryForm
          userId={profile.id}
          inventory={{ id: detail.id, name: detail.name, categories: detail.categories, imageUrl, isPublic: detail.isPublic }}
        />
      </div>
    </main>
  );
}
