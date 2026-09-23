"use client";

import Image from "next/image";
import { STICKERS, stickerLabel, stickerSrc } from "@/lib/inmyin/stickers";

type StickerSheetProps = {
  onPick: (code: string) => void;
  onClose: () => void;
};

// 스티커 고르기 — 아래에서 올라오는 판 (인벤토리 가져오기와 같은 모양). 하나를 누르면 캔버스에 올라가고 판은 닫힌다
export function StickerSheet({ onPick, onClose }: StickerSheetProps) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/40" />
      <div role="dialog" aria-label="스티커" className="relative mx-auto flex max-h-[60dvh] w-full max-w-md flex-col rounded-t-xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h2 className="px-5 pt-7 text-link font-bold">스티커</h2>
        <ul className="mt-4 grid grid-cols-6 gap-2 overflow-y-auto px-5">
          {STICKERS.map((code) => (
            <li key={code}>
              <button type="button" onClick={() => onPick(code)} aria-label={stickerLabel(code)} className="relative flex aspect-square w-full items-center justify-center rounded-md active:bg-gray-2">
                <Image src={stickerSrc(code)} alt="" width={40} height={40} unoptimized />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
