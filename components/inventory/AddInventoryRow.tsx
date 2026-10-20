"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { INVENTORY_ROW_CLASS, InventoryThumb } from "./InventoryRow";
import { useAddInventory } from "./useAddInventory";

// 인벤토리 관리의 + 줄. 누르면 "사진 업로드 / 사진 찍기" 메뉴가 뜬다 (useAddInventory)
export function AddInventoryRow() {
  const add = useAddInventory("left-19 top-7");
  return (
    <li className="relative">
      <button type="button" onClick={add.open} className={`${INVENTORY_ROW_CLASS} text-left text-disabled`}>
        <InventoryThumb>
          <Icon name="plus" />
        </InventoryThumb>
        <span className="text-body">+를 눌러 인벤토리를 추가하세요.</span>
      </button>
      {add.elements}
    </li>
  );
}

// 프로필 띠 맨 끝의 + 칸 "만들기" (무늬 빈화면프로필설계 v01 3-1). 띠의 다른 칸과 같은 60 칸 · 이름 자리.
// 띠는 옆으로 넘기는 상자(overflow)라 그 안에 메뉴를 띄우면 잘린다 — 메뉴는 누른 칸 바로 아래 화면 좌표(fixed)에 띄운다
export function AddInventoryTile() {
  const add = useAddInventory("left-0 top-0");
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  return (
    <li className="w-15 shrink-0">
      <button
        type="button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          // 오른쪽 끝 칸이면 메뉴(약 130)가 화면 밖으로 나가지 않게 왼쪽으로 당긴다
          setAt({ left: Math.min(rect.left, window.innerWidth - 150), top: rect.top + 64 });
          add.open();
        }}
        aria-label="인벤토리 만들기"
        className="block w-15 active:opacity-60"
      >
        <span className="block rounded-md border border-transparent p-1">
          <span className="flex size-13 items-center justify-center rounded-sm border border-border bg-white text-gray-mid">
            <Icon name="plus24" />
          </span>
        </span>
        <span className="mt-1 block truncate text-center text-[11px] leading-[1.2] font-medium text-ink-muted">만들기</span>
      </button>
      <div className="fixed z-20" style={at ?? { left: 0, top: 0 }}>
        {add.elements}
      </div>
    </li>
  );
}
