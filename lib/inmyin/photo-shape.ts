// 갤러리 사진을 모양대로 자른다 (에디터 ③ 사진 다듬기). 결과는 배경이 투명한 PNG 라 어느 배경 위에서든 그 모양으로 보인다.
// 원본 비율은 원본만 지키고, 나머지는 가운데를 정사각으로 잘라 그 안에 모양을 넣는다

export const PHOTO_SHAPES = [
  { id: "original", label: "원본" },
  { id: "circle", label: "원" },
  { id: "square", label: "네모" },
  { id: "rounded", label: "둥근 네모" },
  { id: "heart", label: "하트" },
] as const;
export type PhotoShape = (typeof PHOTO_SHAPES)[number]["id"];

// 100×100 칸에 그린 하트 (Background.tsx 와 같은 것)
export const HEART_PATH = "M50 88 C20 65 5 50 5 32 C5 18 16 8 29 8 C38 8 46 13 50 21 C54 13 62 8 71 8 C84 8 95 18 95 32 C95 50 80 65 50 88 Z";
// 미리보기(CSS clip-path)용 — 0~1 칸
export const HEART_CLIP = HEART_PATH.replace(/(\d+(?:\.\d+)?)/g, (n) => String(Number(n) / 100));

// 모양대로 잘라 PNG 로. original 이면 그대로 돌려준다
export async function cropToShape(photo: Blob, shape: PhotoShape): Promise<Blob> {
  if (shape === "original") return photo;
  const image = await loadImage(photo);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("캔버스를 만들지 못했어요.");

  // 모양을 Path2D 로 만들어 그 안에만 그린다
  const path = new Path2D();
  if (shape === "circle") path.arc(side / 2, side / 2, side / 2, 0, Math.PI * 2);
  else if (shape === "rounded") path.roundRect(0, 0, side, side, side * 0.18);
  else if (shape === "heart") path.addPath(new Path2D(HEART_PATH), new DOMMatrix().scale(side / 100, side / 100));
  else path.rect(0, 0, side, side);
  context.clip(path);

  // 가운데를 정사각으로
  context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, side, side);
  URL.revokeObjectURL(image.src);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("사진을 자르지 못했어요."))), "image/png"));
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("사진을 열지 못했어요."));
    image.src = URL.createObjectURL(blob);
  });
}
