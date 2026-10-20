"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAddItem } from "@/components/item/useAddItem";
import { DarkMenu } from "./DarkMenu";
import { PlusMark } from "./TabIcon";

// 웹 상단 바의 "+ 추가" — 만드는 곳은 여기. 상단 바의 유일한 검정 채움(주 버튼)이고, 폰 하단 탭의 검정 + 와 같은 자리값이다.
// 누르면 + 메뉴(M-03 · M-04)와 같은 반투명 검은 메뉴: "아이템 넣기"(컴퓨터는 파일 창이 바로 열린다 — 넣을 곳은 /add 가 골라 두고 M-08 에서 바꾼다) ·
// "INMYIN 만들기". 꽉 참 · 인벤토리 없음은 여기서 묻지 않는다 — /add 가 정한다(상단 바가 매 화면 인벤토리를 읽지 않게) (무늬 인벤토리고르기설계 v01 6절)
export function WebNavAdd() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const addItem = useAddItem();

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-1 rounded-full bg-ink pl-3 pr-4 text-label font-bold text-white hover:opacity-80 active:opacity-60"
      >
        <PlusMark size={20} />
        추가
      </button>
      {open && (
        <DarkMenu
          className="right-0 top-full mt-2"
          onClose={() => setOpen(false)}
          items={[
            { label: "아이템 넣기", onSelect: addItem.start },
            { label: "INMYIN 만들기", onSelect: () => router.push("/my/inmyin/new") },
          ]}
        />
      )}
      {addItem.fileInput}
    </div>
  );
}
