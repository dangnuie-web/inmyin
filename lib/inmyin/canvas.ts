// INMYIN 캔버스의 저장 형태 (InmyinPost.canvasJson). 화면 크기와 상관없이 늘 이 크기 기준으로 적는다 —
// 폰에서 만든 것을 웹에서 열어도, 이미지로 뽑아도 같아야 한다. 4:5 세로 (인스타그램 세로 게시물의 최대 비율)
export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;

// 새로 올린 것의 기본 크기 — 긴 변이 캔버스 폭의 이만큼
const DEFAULT_SIZE_RATIO = 0.4;
// 캔버스에 올릴 수 있는 개수. 너무 많으면 폰이 느려진다
export const MAX_OBJECTS = 40;

// 캔버스 위의 것 하나. 아이템(배경 지운 썸네일) · 갤러리 사진 · 스티커
export type CanvasObject = {
  id: string;
  kind: "item" | "photo" | "sticker";
  // 아이템이면 그 아이템의 id — 게시물의 탭 영역(PostItem)이 여기서 나온다
  itemId?: string;
  // 그림 주소. 아이템 · 스티커는 URL, 갤러리 사진은 올리기 전까지 data: 주소
  src: string;
  // 왼쪽 위 모서리 (회전 전), 크기, 회전(도). 모두 1080×1350 기준
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export type CanvasDocument = {
  version: 1;
  width: typeof CANVAS_WIDTH;
  height: typeof CANVAS_HEIGHT;
  objects: CanvasObject[];
};

export function emptyDocument(): CanvasDocument {
  return { version: 1, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, objects: [] };
}

// 그림의 원래 비율을 지키며 기본 크기로 캔버스 가운데에 놓는다. 이미 여러 개가 있으면 조금씩 비껴 놓아 겹쳐 안 보이는 일을 막는다
export function placeNew(
  base: Pick<CanvasObject, "kind" | "src" | "itemId">,
  naturalWidth: number,
  naturalHeight: number,
  existingCount: number,
): CanvasObject {
  const longest = CANVAS_WIDTH * DEFAULT_SIZE_RATIO;
  const scale = longest / Math.max(naturalWidth, naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  const offset = (existingCount % 5) * 40;
  return {
    id: newObjectId(),
    ...base,
    x: (CANVAS_WIDTH - width) / 2 + offset,
    y: (CANVAS_HEIGHT - height) / 2 + offset,
    width,
    height,
    rotation: 0,
  };
}

function newObjectId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// 캔버스 상자가 주는 자리에 4:5 로 꽉 차게 — 폭이 남으면 높이에, 높이가 남으면 폭에 맞춘다
export function fitCanvas(boxWidth: number, boxHeight: number) {
  const byWidth = { width: boxWidth, height: (boxWidth * CANVAS_HEIGHT) / CANVAS_WIDTH };
  if (byWidth.height <= boxHeight) return byWidth;
  return { width: (boxHeight * CANVAS_WIDTH) / CANVAS_HEIGHT, height: boxHeight };
}
