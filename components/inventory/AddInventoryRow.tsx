"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { Icon } from "@/components/ui/Icon";
import { pickedPhoto, setPendingPhoto } from "@/lib/image/pending-photo";
import { NEW_INVENTORY_CAMERA_PATH, NEW_INVENTORY_EDIT_PATH } from "@/lib/inventory/paths";
import { INVENTORY_ROW_CLASS, InventoryThumb } from "./InventoryRow";

// 인벤토리 목록의 + 줄. 누르면 "사진 업로드 / 사진 찍기" 메뉴가 뜬다.
// 사진을 고르면 그 사진을 들고 편집 화면(M-07)으로 가고, 찍겠다고 하면 촬영 화면(M-06)으로 간다.
export function AddInventoryRow() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  function onAddClick() {
    // 손가락으로 쓰는 기기(폰·태블릿)에서만 메뉴를 띄운다.
    // 데스크톱에는 찍을 카메라가 없으니 바로 파일 고르기를 연다
    if (window.matchMedia("(pointer: coarse)").matches) setMenuOpen(true);
    else uploadRef.current?.click();
  }

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingPhoto(pickedPhoto(file));
    router.push(NEW_INVENTORY_EDIT_PATH);
  }

  return (
    <li className="relative">
      <button type="button" onClick={onAddClick} className={`${INVENTORY_ROW_CLASS} text-left text-disabled`}>
        <InventoryThumb>
          <Icon name="plus" />
        </InventoryThumb>
        <span className="text-body">+를 눌러 인벤토리를 추가하세요.</span>
      </button>

      {menuOpen && (
        <DarkMenu
          className="left-19 top-7"
          onClose={() => setMenuOpen(false)}
          items={[
            { label: "사진 업로드", onSelect: () => uploadRef.current?.click() },
            { label: "사진 찍기", onSelect: () => router.push(NEW_INVENTORY_CAMERA_PATH) },
          ]}
        />
      )}

      <input ref={uploadRef} type="file" accept="image/*" hidden onChange={onPhotoChange} />
    </li>
  );
}
