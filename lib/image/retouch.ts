// 누끼 손질 (M-07) — 지우개 · 되살리기 붓의 계산. DOM 을 쓰지 않아 node 에서 시험한다 (retouch.test.mjs).
//
// 작업 사진(work)은 배경을 지운 사진의 RGBA 픽셀이다. 손질은 이 배열을 그 자리에서 고친다.
// - 지우개: 붓 자리의 투명도(알파)를 낮춘다
// - 되살리기: 붓 자리에 배경을 지우기 전 원래 사진(original)의 색을 다시 가져오고 알파를 올린다
// 붓 가장자리는 부드럽게(안쪽 60% 는 꽉, 바깥 40% 는 점점 옅게) — 딱 잘린 테두리가 생기지 않게.

export type Pixels = Uint8ClampedArray | Uint8Array;

export type BrushMode = "erase" | "restore";

// 고친 범위 (화면에 그 부분만 다시 그리려고)
export type Rect = { x: number; y: number; width: number; height: number };

// 붓의 꽉 찬 안쪽 비율
const HARD = 0.6;

// 붓 한 번 찍기. (cx, cy) 는 사진 픽셀 좌표, radius 도 사진 픽셀. 고친 범위를 돌려준다(없으면 null)
export function stamp(
  work: Pixels,
  original: Pixels,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  mode: BrushMode,
): Rect | null {
  const r = Math.max(0.5, radius);
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(width - 1, Math.ceil(cx + r));
  const y1 = Math.min(height - 1, Math.ceil(cy + r));
  if (x0 > x1 || y0 > y1) return null;

  const inner = r * HARD;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      // 픽셀 가운데까지의 거리
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d > r) continue;
      const strength = d <= inner ? 1 : 1 - (d - inner) / (r - inner);
      const amount = Math.round(strength * 255);
      const i = (y * width + x) * 4;
      const alpha = work[i + 3];
      if (mode === "erase") {
        work[i + 3] = Math.min(alpha, 255 - amount);
      } else if (amount > alpha) {
        // 되살리기 — 원래 사진의 색으로. 지운 자리의 색은 라이브러리가 아무 값(대개 0)으로 둬서 믿을 수 없다
        work[i] = original[i];
        work[i + 1] = original[i + 1];
        work[i + 2] = original[i + 2];
        work[i + 3] = amount;
      }
    }
  }
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// 두 점 사이를 붓으로 잇는 찍을 자리들. 손가락이 빨리 움직여도 끊기지 않게 반지름의 1/4 간격으로 (from 은 이미 찍었으니 뺀다)
export function strokePoints(fromX: number, fromY: number, toX: number, toY: number, radius: number) {
  const distance = Math.hypot(toX - fromX, toY - fromY);
  const step = Math.max(0.5, radius / 4);
  const count = Math.max(1, Math.ceil(distance / step));
  const points: [number, number][] = [];
  for (let k = 1; k <= count; k += 1) {
    const t = k / count;
    points.push([fromX + (toX - fromX) * t, fromY + (toY - fromY) * t]);
  }
  return points;
}

// 두 범위를 감싸는 범위
export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

// 두 손가락 확대 · 이동. 시작할 때의 두 손가락 가운데(mid0) 아래에 있던 사진의 점이 지금 가운데(mid) 아래에 오도록 옮긴다.
// 배율은 1(처음 맞춘 크기) ~ maxScale
export type View = { scale: number; x: number; y: number };

export function pinchView(start: View, mid0: [number, number], dist0: number, mid: [number, number], dist: number, maxScale = 8): View {
  const scale = Math.min(maxScale, Math.max(1, start.scale * (dist / Math.max(1, dist0))));
  const ratio = scale / start.scale;
  return {
    scale,
    x: mid[0] - (mid0[0] - start.x) * ratio,
    y: mid[1] - (mid0[1] - start.y) * ratio,
  };
}

// 확대한 사진이 화면 밖으로 달아나지 않게. 사진은 화면(box) 가운데에 contentWidth × contentHeight 로 놓여 있고,
// view 는 그 자리에서 왼쪽 위를 기준으로 키우고(scale) 옮긴(x, y) 값이다.
// 키운 사진이 화면보다 작으면 가운데로, 크면 화면 가장자리에 빈 곳이 생기지 않게 붙든다
export function clampView(view: View, boxWidth: number, boxHeight: number, contentWidth: number, contentHeight: number): View {
  const axis = (offset: number, content: number, box: number) => {
    const base = (box - content) / 2;
    const size = content * view.scale;
    const left = base + offset;
    const clamped = size <= box ? (box - size) / 2 : Math.min(0, Math.max(box - size, left));
    return clamped - base;
  };
  return { scale: view.scale, x: axis(view.x, contentWidth, boxWidth), y: axis(view.y, contentHeight, boxHeight) };
}
