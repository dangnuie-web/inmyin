"use client";

import { useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { pickedPhoto, setPendingPhoto } from "@/lib/image/pending-photo";
import { addItemPath, itemCameraPath, itemEditPath } from "@/lib/inventory/paths";

type AddItemOptions = {
  // 인벤토리 상세의 + — 그 인벤토리가 1순위라 /add 를 거치지 않고 바로 간다
  inventoryId?: string;
  // 아이템 모아보기(M-13)에서 칩을 고른 채 눌렀으면 그 태그. /add 가 그 태그 아이템이 많은 곳을 골라 두고 M-08 이 미리 채운다
  category?: string | null;
};

// 아이템 넣기의 시작 — 인벤토리 + · 아이템 모아보기 + · 웹 상단 "+ 추가 › 아이템 넣기"가 같이 쓴다 (무늬 인벤토리고르기설계 v01 5-3).
// 촬영은 폰에서만 된다 (CLAUDE.md 규칙 5): 손가락으로 쓰는 기기면 촬영(M-06)으로 — 갤러리에서 고르는 것도 거기서 한다.
// 마우스를 쓰는 컴퓨터면 사진 고르기 창을 바로 열고, 고르면 그 사진을 들고 사진편집(M-07)으로.
// 사진은 브라우저 메모리에 있어서 꼭 router.push 로 간다 (<a href> · window.location 은 화면을 새로 읽어 사진을 잃는다).
// fileInput(숨은 파일 입력)은 부르는 쪽이 한 번 그려 둔다
export function useAddItem({ inventoryId, category }: AddItemOptions = {}) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);

  function start() {
    if (window.matchMedia("(pointer: coarse)").matches) {
      router.push(inventoryId ? itemCameraPath(inventoryId, { category }) : addItemPath({ category }));
      return;
    }
    uploadRef.current?.click();
  }

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    // 창을 닫았으면 아무 일 없음
    if (!file) return;
    setPendingPhoto(pickedPhoto(file));
    router.push(inventoryId ? itemEditPath(inventoryId, { category }) : addItemPath({ category, toEdit: true }));
  }

  const fileInput = <input ref={uploadRef} type="file" accept="image/*" hidden onChange={onPhotoChange} />;

  return { start, fileInput };
}
