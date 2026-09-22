import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackingBoard } from "@/components/inventory/PackingBoard";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getGridColumns } from "@/lib/inventory/grid-columns";
import { inventoryPath } from "@/lib/inventory/paths";
import { getMyPackingInventories } from "@/lib/inventory/queries";

export const metadata: Metadata = { title: "짐싸기 · INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// M-05 · 짐싸기. 인벤토리 상세(M-04)의 짐싸기 버튼에서 온다. 그 인벤토리가 위쪽에, 다른 하나가 아래쪽에 열린다.
// 화면 높이를 딱 반씩 나눠 쓰고, 칸이 많으면 각 절반 안에서만 스크롤한다
export default async function PackingPage(props: PageProps<"/my/inventories/[id]/packing">) {
  const profile = await requireProfile();
  const { id } = await props.params;
  if (!UUID_PATTERN.test(id)) notFound();

  const [inventories, columns] = await Promise.all([getMyPackingInventories(profile.id), getGridColumns()]);
  if (!inventories.some((inventory) => inventory.id === id)) notFound();

  return (
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col pb-[env(safe-area-inset-bottom)]">
      <HeaderMini icon="close" href={inventoryPath(id)} title="짐싸기" />
      <PackingBoard inventories={inventories} startId={id} columns={columns} />
    </main>
  );
}
