"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { Icon } from "@/components/ui/Icon";
import { setPendingPhoto } from "@/lib/image/pending-photo";
import { INVENTORY_ROW_CLASS, InventoryThumb } from "./InventoryRow";

const NEW_INVENTORY_PATH = "/my/inventories/new";

// 인벤토리 목록의 + 줄. 누르면 "사진 업로드 / 사진 찍기" 메뉴가 뜬다.
// 사진을 고르면 그 사진을 들고 정보 입력 화면으로 간다.
export function AddInventoryRow() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function onAddClick() {
    // 손가락으로 쓰는 기기(폰·태블릿)에서만 메뉴를 띄운다.
    // 데스크톱에는 찍을 카메라가 없으니 바로 파일 고르기를 연다
    if (window.matchMedia("(pointer: coarse)").matches) setMenuOpen(true);
    else uploadRef.current?.click();
  }

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingPhoto(file);
    router.push(NEW_INVENTORY_PATH);
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
            // capture 가 붙은 입력칸은 갤러리 대신 휴대폰 카메라를 바로 연다.
            // 촬영 화면(M-06)을 만들면 그쪽으로 바꾼다
            { label: "사진 찍기", onSelect: () => cameraRef.current?.click() },
          ]}
        />
      )}

      <input ref={uploadRef} type="file" accept="image/*" hidden onChange={onPhotoChange} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhotoChange} />
    </li>
  );
}
