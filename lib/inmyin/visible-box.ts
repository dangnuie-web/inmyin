import type { ImageExtent } from "./templates";

// 그림의 원래 크기와 보이는 부분(알파 > 8 인 픽셀의 테두리). 누끼 아이템은 둘레에 투명한 여백이 있어서,
// 틀 자리에 맞출 때 여백이 아니라 보이는 물건을 상자에 꽉 채우려고 잰다 (데모 게시물 scripts/demo/posts.mjs visibleBox 와 같은 기준).
// 그림 하나에 한 번만 잰다 — 주소별로 기억. 못 읽으면(다른 곳 그림이 CORS 를 막는 등) 그림 전체
const cache = new Map<string, Promise<ImageExtent>>();

// 재는 그림의 긴 변. 썸네일이 긴 변 640 이라 보통 그대로
const MAX_SIDE = 640;

export function loadImageExtent(src: string): Promise<ImageExtent> {
  let pending = cache.get(src);
  if (!pending) {
    pending = measure(src);
    cache.set(src, pending);
  }
  return pending;
}

function measure(src: string): Promise<ImageExtent> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    if (/^https?:/.test(src)) img.crossOrigin = "anonymous";
    img.onerror = () => {
      cache.delete(src);
      reject(new Error("이미지를 불러오지 못했어요."));
    };
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      try {
        const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
        const w = Math.max(1, Math.round(width * scale));
        const h = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return resolve({ width, height });
        context.drawImage(img, 0, 0, w, h);
        const { data } = context.getImageData(0, 0, w, h);
        let x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 8) {
              if (x < x0) x0 = x;
              if (x > x1) x1 = x;
              if (y < y0) y0 = y;
              if (y > y1) y1 = y;
            }
          }
        }
        if (x1 < 0) return resolve({ width, height });
        resolve({ width, height, bbox: { x: x0 / scale, y: y0 / scale, width: (x1 - x0 + 1) / scale, height: (y1 - y0 + 1) / scale } });
      } catch {
        // 캔버스가 더럽혀져(다른 곳 그림) 픽셀을 못 읽음 — 그림 전체로
        resolve({ width, height });
      }
    };
    img.src = src;
  });
}
