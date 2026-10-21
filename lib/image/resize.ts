import { encodeIndexedPng, hasTransparency, quantize } from "./png8";

// 올리기 전에 브라우저에서 사진을 줄인다. 폰 사진은 한 장에 몇 MB 라서 그대로 올리면 느리고 저장소도 금방 찬다.

// 원본 보관용 — docs/data-model.md 의 "장변 1280px"
export const RAW_MAX_SIDE = 1280;
// 목록·격자에 보이는 썸네일용
export const THUMBNAIL_MAX_SIDE = 640;

// webp · jpeg 화질. 크기(640) · 화질은 그대로 둔다 — 아이템 상세는 폰에서 너비 약 350pt(3배 화면이면 1050px)라
// 640 도 이미 늘려 보이는 크기다. 무거웠던 건 사파리의 캔버스 png 였고, 그건 아래 withoutWebp 가 고친다 (2026-10-21)
const QUALITY = 0.85;

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

// 이 브라우저가 캔버스를 webp 로 만들 수 있는지 — 한 번만 본다. 사파리는 못 만들고 말없이 png 를 돌려준다
let webpSupported: boolean | undefined;
function canMakeWebp() {
  if (webpSupported === undefined) {
    const probe = document.createElement("canvas");
    probe.width = probe.height = 1;
    webpSupported = probe.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webpSupported;
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

  // webp 가 가장 가볍고 투명도 지킨다
  const blob = canMakeWebp() ? await toBlob(canvas, "image/webp") : await withoutWebp(canvas);
  if (!blob) throw new Error("사진을 읽지 못했습니다.");
  return blob;
}

// webp 를 못 만드는 브라우저(사파리). 캔버스 png 는 픽셀을 그대로 담아 사진에 너무 무겁다(640px 누끼 한 장 80~620KB).
// - 투명한 곳이 없으면 jpeg — 잃는 것이 없다. 배경을 지운 적 없는 사진, 배경 있는 png(화면 캡처 등)
// - 투명한 곳이 있으면(배경을 지운 누끼) 256색 팔레트 png (png8.ts) — jpeg 은 지운 자리가 검게 칠해진다.
//   팔레트 png 를 못 만들면(CompressionStream 이 없는 옛 브라우저) 예전처럼 캔버스 png
async function withoutWebp(canvas: HTMLCanvasElement) {
  const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
  if (!hasTransparency(data)) return toBlob(canvas, "image/jpeg");
  if (typeof CompressionStream !== "undefined") {
    try {
      const png = await encodeIndexedPng(quantize(data, canvas.width, canvas.height));
      return new Blob([png as BlobPart], { type: "image/png" });
    } catch {
      // 아래 캔버스 png 로
    }
  }
  return toBlob(canvas, "image/png");
}

// image/webp → webp, image/png → png, image/jpeg → jpg
export function extensionOf(blob: Blob) {
  if (blob.type === "image/webp") return "webp";
  return blob.type === "image/png" ? "png" : "jpg";
}
