"use client";

import Image from "next/image";
import { HeaderMini } from "@/components/ui/HeaderMini";

type PreviewScreenProps = {
  // 방금 만든 이미지 (브라우저 안 주소)
  imageUrl: string;
  onClose: () => void;
  onPost: () => void;
  onSave: () => void;
};

// M-10 · INMYIN 이미지 캡처. 캔버스를 통째로 만든 이미지를 보여주고 포스팅(M-11)이나 JPG 저장으로 간다.
// × 를 누르면 에디터로 돌아간다 — 캔버스는 그대로 있다
export function PreviewScreen({ imageUrl, onClose, onPost, onSave }: PreviewScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col bg-surface pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <HeaderMini icon="close" onClick={onClose} title="INMYIN" />
      {/* 피그마 M-10: 흰 카드에 옅은 테두리, 둥근 모서리 */}
      <div className="mt-6 px-8">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gray-3 bg-white">
          <Image src={imageUrl} alt="만든 INMYIN" fill sizes="(min-width: 448px) 380px, 90vw" unoptimized className="object-contain" />
        </div>
      </div>
      <div className="mt-10 flex flex-col items-center gap-3">
        <button type="button" onClick={onPost} className="h-11 w-52 rounded-full border border-ink bg-white text-body font-bold text-ink active:opacity-60">
          포스팅 하기
        </button>
        <button type="button" onClick={onSave} className="h-11 w-52 rounded-full bg-ink text-body font-bold text-white active:opacity-80">
          JPG 이미지 저장하기
        </button>
      </div>
    </main>
  );
}
