"use client";

import { useRef, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { pickedPhoto, setPendingPhoto } from "@/lib/image/pending-photo";

type PhotoChangeOptions = {
  // 폰 — 촬영(M-06) 주소
  cameraHref: string;
  // 컴퓨터 — 사진을 고른 뒤 갈 사진편집(M-07) 주소
  editHref: string;
  // 떠나기 직전에 부른다. 수정 화면이 쓰던 값을 맡겨 둔다(savePhotoChangeDraft)
  beforeLeave: () => void;
};

// 수정 화면(아이템 · 인벤토리)의 사진 바꾸기. 아이템 넣기(useAddItem)와 같은 갈림이다 (CLAUDE.md 규칙 5):
// 손가락으로 쓰는 기기면 촬영으로 — 갤러리에서 고르는 것도 거기서 한다. 마우스면 사진 고르기 창을 바로 열고, 고르면 사진편집으로.
// 사진은 브라우저 메모리에 있어서 꼭 router.push 로 간다. fileInput(숨은 파일 입력)은 부르는 쪽이 한 번 그려 둔다
export function usePhotoChange({ cameraHref, editHref, beforeLeave }: PhotoChangeOptions) {
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);

  function start() {
    if (window.matchMedia("(pointer: coarse)").matches) {
      beforeLeave();
      router.push(cameraHref);
      return;
    }
    uploadRef.current?.click();
  }

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    // 창을 닫았으면 아무 일 없음 — 수정 화면에 그대로 머문다
    if (!file) return;
    beforeLeave();
    setPendingPhoto(pickedPhoto(file));
    router.push(editHref);
  }

  const fileInput = <input ref={uploadRef} type="file" accept="image/*" hidden onChange={onPhotoChange} />;

  return { start, fileInput };
}
