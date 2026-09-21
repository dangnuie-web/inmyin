// 올리기 전에 브라우저에서 사진을 줄인다. 폰 사진은 한 장에 몇 MB 라서 그대로 올리면 느리고 저장소도 금방 찬다.

// 원본 보관용 — docs/data-model.md 의 "장변 1280px"
export const RAW_MAX_SIDE = 1280;
// 목록·격자에 보이는 썸네일용
export const THUMBNAIL_MAX_SIDE = 640;

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
}

// 긴 변이 maxSide 를 넘지 않게 줄인다. 이미 작으면 크기는 그대로 둔다
export async function resizeImage(file: File, maxSide: number): Promise<Blob> {
  // from-image — 폰을 세워 찍은 사진이 옆으로 눕지 않게 한다
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // webp 가 가장 가볍다. 사파리처럼 webp 로 못 만드는 브라우저는 말없이 png 를 돌려주는데,
  // png 는 사진에 너무 무거워서 그때는 jpeg 로 다시 만든다
  let blob = await toBlob(canvas, "image/webp");
  if (blob?.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
  if (!blob) throw new Error("사진을 읽지 못했습니다.");
  return blob;
}

// image/webp → webp, image/jpeg → jpg
export function extensionOf(blob: Blob) {
  return blob.type === "image/webp" ? "webp" : "jpg";
}
