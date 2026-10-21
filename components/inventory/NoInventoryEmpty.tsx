"use client";

import { EmptyBag } from "@/components/ui/EmptyBag";
import { useAddInventory } from "./useAddInventory";

// 내 인벤토리가 하나도 없을 때의 프로필 (무늬 빈화면프로필설계 v01 4-3). 띠 · 이름 줄 · 토글 · 칩 없이 탭 줄 바로 아래 빈 가방.
// "인벤토리 만들기"는 띠의 + 칸과 같은 메뉴 — 만들고 나면 새 인벤토리의 프로필 격자로 돌아와 "아이템 넣기"로 이어진다
export function NoInventoryEmpty() {
  const add = useAddInventory("left-1/2 top-full -translate-x-1/2 -mt-8", true);
  return (
    <div className="relative">
      <EmptyBag action={{ label: "인벤토리 만들기", onClick: add.open }}>아직 인벤토리가 없어요. 옷장, 가방, 서랍… 물건이 있는 곳부터 하나 만들어 보세요.</EmptyBag>
      {add.elements}
    </div>
  );
}
