"use client";

import { useEffect, useState } from "react";

// 캔버스에 그릴 그림을 브라우저에 미리 불러 둔다. 다 불려야 image 가 생긴다 (그전엔 null).
// 다른 곳(Supabase 저장소)에서 오는 그림은 crossOrigin 을 켜야 나중에 캔버스를 이미지로 뽑을 수 있다 —
// 저장소가 CORS 를 허용하고 있어서 된다. 같은 곳의 그림(/stickers, blob:)은 그냥 불러도 된다
export function useImage(src: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    if (/^https?:/.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);

  return image;
}

// 그림의 원래 크기만 알아낸다 — 캔버스에 처음 놓을 때 비율을 지키려고
export function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (/^https?:/.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    img.src = src;
  });
}
