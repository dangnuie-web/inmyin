import { applyLuts, type buildLuts } from "./adjust";
import { THUMBNAIL_MAX_SIDE } from "./resize";

// 보정(adjust.ts)을 브라우저의 캔버스에 잇는 부분. 계산은 adjust.ts, 여기는 읽고 그리고 파일로 만드는 일만.

type Luts = ReturnType<typeof buildLuts>;

// 사진을 썸네일 크기(긴 변 640)로 줄여 픽셀로 읽는다 — 보정은 썸네일에만 입히므로 이보다 클 필요가 없다
export async function loadPixels(file: File, maxSide = THUMBNAIL_MAX_SIDE): Promise<ImageData> {
  // from-image — 폰을 세워 찍은 사진이 옆으로 눕지 않게 한다 (resize.ts 와 같게)
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

// 보정한 픽셀을 캔버스에 그린다. 캔버스 크기도 사진에 맞춘다
export function drawAdjusted(canvas: HTMLCanvasElement, base: ImageData, luts: Luts) {
  if (canvas.width !== base.width) canvas.width = base.width;
  if (canvas.height !== base.height) canvas.height = base.height;
  const out = new ImageData(applyLuts(base.data, luts), base.width, base.height);
  canvas.getContext("2d")!.putImageData(out, 0, 0);
}

// 보정한 사진을 파일로. 배경을 지운 사진(png)은 투명을 지키려고 png, 아니면 jpeg —
// 올릴 때 한 번 더 줄이며 다시 압축하므로 (resize.ts — webp, 사파리는 jpeg · 팔레트 png) 여기서는 화질을 높게 둔다
export function adjustedFile(base: ImageData, luts: Luts, transparent: boolean): Promise<File> {
  const canvas = document.createElement("canvas");
  drawAdjusted(canvas, base, luts);
  const type = transparent ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], transparent ? "adjusted.png" : "adjusted.jpg", { type: blob.type }))
          : reject(new Error("사진을 만들지 못했습니다.")),
      type,
      0.95,
    ),
  );
}
