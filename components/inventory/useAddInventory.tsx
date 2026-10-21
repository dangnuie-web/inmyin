"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { pickedPhoto, setPendingPhoto } from "@/lib/image/pending-photo";
import { NEW_INVENTORY_CAMERA_PATH, NEW_INVENTORY_EDIT_PATH } from "@/lib/inventory/paths";
import { withReturnTo } from "@/lib/nav/return-to";

// 새 인벤토리 만들기의 시작 — 관리 화면의 + 줄 · 프로필 띠의 + 칸 · 인벤토리 없음 빈 화면의 "인벤토리 만들기"가 같이 쓴다.
// 손가락으로 쓰는 기기(폰 · 태블릿)는 "사진 업로드 / 사진 찍기" 메뉴를 띄우고, 데스크톱은 찍을 카메라가 없으니 파일 고르기를 바로 연다.
// 사진을 고르면 그 사진을 들고 편집(M-07)으로, 찍겠다고 하면 촬영(M-06)으로 간다.
// elements(메뉴 · 숨은 파일 입력)는 relative 상자 안에 놓는다. menuClassName 은 메뉴를 띄울 자리.
// fromHere — 프로필(띠 + 칸 · 빈 화면)에서 열면 true: 지금 주소를 ?back= 에 실어 촬영 · 편집 · 만들기의 × 가 프로필로 돌아온다.
// 관리 화면은 false — 기본(관리)으로 돌아간다
export function useAddInventory(menuClassName: string, fromHere = false) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  // 누른 때의 주소(띠로 고른 인벤토리 · 보기 방식까지)
  const back = () => (fromHere ? window.location.pathname + window.location.search : null);

  function open() {
    if (window.matchMedia("(pointer: coarse)").matches) setMenuOpen(true);
    else uploadRef.current?.click();
  }

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPendingPhoto(pickedPhoto(file));
    router.push(withReturnTo(NEW_INVENTORY_EDIT_PATH, back()));
  }

  const elements = (
    <>
      {menuOpen && (
        <DarkMenu
          className={menuClassName}
          onClose={() => setMenuOpen(false)}
          items={[
            { label: "사진 업로드", onSelect: () => uploadRef.current?.click() },
            { label: "사진 찍기", onSelect: () => router.push(withReturnTo(NEW_INVENTORY_CAMERA_PATH, back())) },
          ]}
        />
      )}
      <input ref={uploadRef} type="file" accept="image/*" hidden onChange={onPhotoChange} />
    </>
  );

  return { open, elements };
}
