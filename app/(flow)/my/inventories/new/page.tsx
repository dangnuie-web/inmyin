import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getMyInventories } from "@/lib/inventory/queries";
import { planLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "인벤토리 만들기 · INMYIN" };

// 인벤토리 정보 입력 (피그마 M-08 · 인벤토리 정보 입력).
// (flow) 묶음은 하단 탭 없이 화면 전체를 쓰는 흐름이다 — 촬영 · 편집 · 정보 입력
export default async function NewInventoryPage() {
  const profile = await requireProfile();

  // 한도에 닿았으면 목록으로 돌려보낸다. 거기에 "인벤토리 늘리기" 버튼이 있다
  const inventories = await getMyInventories(profile.id);
  if (inventories.length >= planLimits(profile.plan).maxInventories) redirect("/my/inventories");

  return (
    <main className="flex flex-1 flex-col bg-surface-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <HeaderMini icon="close" href="/my/inventories" title="저장하기" tone="dark" />
        <InventoryForm userId={profile.id} />
      </div>
    </main>
  );
}
