"use client";

import { useMemo } from "react";
import { Group, Path, Rect } from "react-konva";
import { CANVAS_HEIGHT, CANVAS_WIDTH, type CanvasBackground } from "@/lib/inmyin/canvas";

// 캔버스 바닥 (Canvas 의 맨 아래 층). 단색 · 선형 · 원형 · 하트 그라디언트 · 패턴.
// 전부 캔버스가 스스로 그리는 것이라 이미지로 뽑을 때도 그대로 나온다

// 하트 그라디언트는 크기가 다른 하트를 바깥부터 안쪽으로 겹쳐 그려 만든다 (Konva 에 하트 모양 그라디언트는 없다). 겹칠 장 수
const HEART_STEPS = 40;
// 100×100 칸에 그린 하트. 가운데가 (50, 50) 쯤
const HEART_PATH = "M50 88 C20 65 5 50 5 32 C5 18 16 8 29 8 C38 8 46 13 50 21 C54 13 62 8 71 8 C84 8 95 18 95 32 C95 50 80 65 50 88 Z";
// 패턴 한 조각의 크기 (캔버스 기준). 이 조각이 바둑판처럼 반복된다
const TILE = 72;

export function Background({ background }: { background: CanvasBackground }) {
  const tile = useMemo(() => (background.kind === "pattern" ? makeTile(background.pattern, background.color, background.ink) : null), [background]);

  if (background.kind === "color") return <Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={background.color} listening={false} />;

  if (background.kind === "pattern") {
    // Konva 는 그림 대신 작은 캔버스도 무늬로 받는다 — 타입만 그림으로 적혀 있어서 맞춰 준다
    return <Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fillPatternImage={(tile ?? undefined) as HTMLImageElement | undefined} fillPatternRepeat="repeat" listening={false} />;
  }

  const { shape, from, to, angle } = background;
  if (shape === "linear") {
    // 각도(도)를 캔버스를 가로지르는 시작 · 끝 점으로. 0 = 왼쪽→오른쪽, 90 = 위→아래
    const radians = (angle * Math.PI) / 180;
    const half = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    const reach = Math.abs(Math.cos(radians)) * half.x + Math.abs(Math.sin(radians)) * half.y;
    const dx = Math.cos(radians) * reach;
    const dy = Math.sin(radians) * reach;
    return (
      <Rect
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        fillLinearGradientStartPoint={{ x: half.x - dx, y: half.y - dy }}
        fillLinearGradientEndPoint={{ x: half.x + dx, y: half.y + dy }}
        fillLinearGradientColorStops={[0, from, 1, to]}
        listening={false}
      />
    );
  }

  if (shape === "radial") {
    const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    return (
      <Rect
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        fillRadialGradientStartPoint={center}
        fillRadialGradientEndPoint={center}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndRadius={Math.hypot(center.x, center.y)}
        fillRadialGradientColorStops={[0, from, 1, to]}
        listening={false}
      />
    );
  }

  // 하트: 바깥 색으로 다 칠한 뒤, 큰 하트부터 작은 하트까지 색을 조금씩 바꿔 가며 겹친다
  const center = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
  const largest = (Math.hypot(CANVAS_WIDTH, CANVAS_HEIGHT) / 100) * 1.1;
  const smallest = 0.6;
  return (
    <Group listening={false}>
      <Rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={to} />
      {Array.from({ length: HEART_STEPS }, (_, i) => {
        const t = i / (HEART_STEPS - 1);
        const scale = largest + (smallest - largest) * t;
        return <Path key={i} data={HEART_PATH} x={center.x} y={center.y} offsetX={50} offsetY={50} scaleX={scale} scaleY={scale} fill={mix(to, from, t)} />;
      })}
    </Group>
  );
}

// 두 색 사이의 색. t = 0 이면 a, 1 이면 b
function mix(a: string, b: string, t: number) {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${channel(ar, br)}, ${channel(ag, bg)}, ${channel(ab, bb)})`;
}

function rgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// 패턴 한 조각을 작은 캔버스에 그린다. 바탕은 color, 무늬는 ink
function makeTile(pattern: "dots" | "stripes" | "grid" | "checker", color: string, ink: string) {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = color;
  context.fillRect(0, 0, TILE, TILE);
  context.fillStyle = ink;
  context.strokeStyle = ink;
  switch (pattern) {
    case "dots":
      context.beginPath();
      context.arc(TILE / 2, TILE / 2, TILE / 9, 0, Math.PI * 2);
      context.fill();
      break;
    case "stripes":
      // 비스듬한 줄. 조각의 이음새가 이어지도록 위아래로 하나씩 더 그린다
      context.lineWidth = TILE / 5;
      for (const offset of [-TILE, 0, TILE]) {
        context.beginPath();
        context.moveTo(0, TILE + offset);
        context.lineTo(TILE, offset);
        context.stroke();
      }
      break;
    case "grid":
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(0, 1.5);
      context.lineTo(TILE, 1.5);
      context.moveTo(1.5, 0);
      context.lineTo(1.5, TILE);
      context.stroke();
      break;
    case "checker":
      context.fillRect(0, 0, TILE / 2, TILE / 2);
      context.fillRect(TILE / 2, TILE / 2, TILE / 2, TILE / 2);
      break;
  }
  return canvas;
}
