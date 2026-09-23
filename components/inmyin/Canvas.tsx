"use client";

import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Image as KonvaImage, Label, Layer, Stage, Tag, Text, Transformer } from "react-konva";
import { CANVAS_WIDTH, type CanvasBackground, type CanvasObject, type ImageObject, type TextObject } from "@/lib/inmyin/canvas";
import { loadTextFont, textFont } from "@/lib/inmyin/fonts";
import { Background } from "./Background";
import { useImage } from "./useImage";

// 고른 것의 화면 위 자리 (px). 에디터가 이 위에 × 버튼과 순서 메뉴를 얹는다
export type OverlayRect = { x: number; y: number; width: number; height: number };

// 손잡이로 줄여도 이보다 작아지지 않는다 (캔버스 기준)
const MIN_SIZE = 60;

type CanvasProps = {
  background: CanvasBackground;
  objects: CanvasObject[];
  // 화면에 그리는 크기 (px). 부모가 4:5 로 맞춰서 준다
  width: number;
  height: number;
  selectedId: string | null;
  // 손가락이 닿는 순간 (끌기 전에 골라지게). 빈 곳이면 null
  onPress: (id: string | null) => void;
  // 끌지 않고 눌렀다 뗐을 때. 이미 골라져 있던 것이면 에디터가 순서 메뉴를 띄운다
  onTap: (id: string) => void;
  // 옮기기 · 키우기 · 돌리기가 끝났을 때
  onChange: (object: CanvasObject) => void;
  // 글자를 그려 본 뒤 잰 크기. 되돌리기 기록에는 남기지 않는다
  onMeasure: (id: string, width: number, height: number) => void;
  // 고른 것의 화면 위 자리. 움직이는 동안은 null (버튼이 따라다니지 않게 잠깐 숨긴다)
  onOverlay: (rect: OverlayRect | null) => void;
  // 에디터가 "이미지 만들기"에서 부른다 — 캔버스를 통째로 JPG 로. pixelRatio 는 1080 / 화면 폭
  captureRef: RefObject<CaptureFn | null>;
};

export type CaptureFn = (pixelRatio: number) => Promise<Blob>;

// INMYIN 캔버스 (M-09). 그림은 1080×1350 기준 좌표로 들고 있고, Stage 를 통째로 줄여서 화면에 맞춘다.
// 누르면 고르기, 끌면 옮기기, 모서리 손잡이로 키우기, 위의 손잡이로 돌리기 — 전부 Konva 가 한다.
// 브라우저에서만 도는 부품이라 Editor 가 dynamic(ssr: false) 로 부른다
export function Canvas({ background, objects, width, height, selectedId, onPress, onTap, onChange, onMeasure, onOverlay, captureRef }: CanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodes = useRef(new Map<string, Konva.Node>());
  const scale = width / CANVAS_WIDTH;
  // 그림이 다 불려서 캔버스에 나타난 횟수. 방금 올린 것은 그림이 불린 뒤에야 손잡이를 붙일 수 있다
  const [loadedCount, setLoadedCount] = useState(0);

  // 고른 것에 손잡이를 붙이고, 그 자리를 에디터에 알린다. 그림이 바뀔 때(옮기고 난 뒤)도 다시 잰다
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    const node = selectedId ? nodes.current.get(selectedId) : undefined;
    if (!transformer || !stage) return;
    transformer.nodes(node ? [node] : []);
    // 글자의 글꼴이 늦게 불려 크기가 바뀌었을 때도 테두리가 새 크기를 따라가게
    transformer.forceUpdate();
    transformer.getLayer()?.batchDraw();
    if (!node) return onOverlay(null);
    const rect = node.getClientRect({ relativeTo: stage });
    onOverlay({ x: rect.x * scale, y: rect.y * scale, width: rect.width * scale, height: rect.height * scale });
  }, [selectedId, objects, scale, onOverlay, loadedCount]);

  // 캔버스를 이미지로. 손잡이는 에디터가 미리 풀어 둔다 (고른 것이 없으면 Transformer 는 아무것도 그리지 않는다)
  useEffect(() => {
    captureRef.current = async (pixelRatio) => {
      const stage = stageRef.current;
      if (!stage) throw new Error("캔버스가 아직 준비되지 않았어요.");
      const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/jpeg", quality: 0.92 });
      return (await fetch(dataUrl)).blob();
    };
    return () => {
      captureRef.current = null;
    };
  }, [captureRef]);

  // 빈 곳(바닥)을 누르면 고른 것을 푼다 — 바닥은 눌림을 받지 않아서(listening=false) 그때의 target 은 Stage 다
  function onStagePress(event: KonvaEventObject<MouseEvent | TouchEvent>) {
    if (event.target === event.target.getStage()) onPress(null);
  }

  return (
    <Stage ref={stageRef} width={width} height={height} scaleX={scale} scaleY={scale} onMouseDown={onStagePress} onTouchStart={onStagePress}>
      <Layer>
        <Background background={background} />
        {objects.map((object) => {
          const shared = {
            register: (node: Konva.Node | null) => (node ? nodes.current.set(object.id, node) : nodes.current.delete(object.id)),
            onPress: () => onPress(object.id),
            onTap: () => onTap(object.id),
            onMoving: () => onOverlay(null),
            onLoaded: () => setLoadedCount((count) => count + 1),
          };
          return object.kind === "text" ? (
            <CanvasText key={object.id} object={object} onChange={onChange} onMeasure={(w, h) => onMeasure(object.id, w, h)} {...shared} />
          ) : (
            <CanvasImage key={object.id} object={object} onChange={onChange} {...shared} />
          );
        })}
        {/* 피그마: 검은 테두리 2px, 모서리에 흰 네모 손잡이. 돌리는 손잡이는 위쪽에 하나 */}
        <Transformer
          ref={transformerRef}
          keepRatio
          enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right"]}
          anchorSize={12}
          anchorStroke="#000000"
          anchorFill="#ffffff"
          anchorStrokeWidth={1}
          anchorCornerRadius={1}
          borderStroke="#000000"
          borderStrokeWidth={2}
          rotateAnchorOffset={28}
          rotationSnaps={[0, 90, 180, 270]}
          rotationSnapTolerance={5}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < MIN_SIZE * scale || newBox.height < MIN_SIZE * scale ? oldBox : newBox)}
        />
      </Layer>
    </Stage>
  );
}

type NodeProps = {
  register: (node: Konva.Node | null) => void;
  onPress: () => void;
  onTap: () => void;
  onMoving: () => void;
  onLoaded: () => void;
};

type CanvasImageProps = NodeProps & {
  object: ImageObject;
  onChange: (object: CanvasObject) => void;
};

// 캔버스 위의 그림 하나. 손잡이로 키우면 Konva 는 scale 을 바꾸는데, 저장은 width · height 로 하므로 끝날 때 바꿔 적고 scale 은 1 로 되돌린다
function CanvasImage({ object, register, onPress, onTap, onChange, onMoving, onLoaded }: CanvasImageProps) {
  const image = useImage(object.src);
  useEffect(() => {
    if (image) onLoaded();
    // 그림이 불린 순간 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image]);
  if (!image) return null;

  function onDragEnd(event: KonvaEventObject<DragEvent>) {
    const node = event.target;
    onChange({ ...object, x: node.x(), y: node.y() });
  }

  function onTransformEnd(event: KonvaEventObject<Event>) {
    const node = event.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange({
      ...object,
      x: node.x(),
      y: node.y(),
      width: Math.max(MIN_SIZE, node.width() * scaleX),
      height: Math.max(MIN_SIZE, node.height() * scaleY),
      rotation: node.rotation(),
    });
  }

  return (
    <KonvaImage
      ref={register}
      image={image}
      x={object.x}
      y={object.y}
      width={object.width}
      height={object.height}
      rotation={object.rotation}
      draggable
      onMouseDown={onPress}
      onTouchStart={onPress}
      onClick={onTap}
      onTap={onTap}
      onDragStart={onMoving}
      onTransformStart={onMoving}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

type CanvasTextProps = NodeProps & {
  object: TextObject;
  onChange: (object: CanvasObject) => void;
  onMeasure: (width: number, height: number) => void;
};

// 캔버스 위의 글자 하나 — 바탕(Tag) + 글자(Text)를 Label 로 묶는다. 손잡이로 키우면 크기 대신 fontSize 를 바꾼다 (글자가 뭉개지지 않게).
// 글꼴 파일이 다 불린 뒤 다시 그린다 — 안 그러면 기본 글꼴로 찍힌 채 남는다
function CanvasText({ object, register, onPress, onTap, onChange, onMeasure, onMoving, onLoaded }: CanvasTextProps) {
  const font = textFont(object.font);
  const labelRef = useRef<Konva.Label | null>(null);
  // 어느 글꼴 · 글자 · 굵기에 대해 글꼴이 준비됐는지. 지금 것과 같아야 준비된 것
  const fontKey = `${object.font}|${object.bold}|${object.text}`;
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const fontReady = readyKey === fontKey;

  useEffect(() => {
    let alive = true;
    loadTextFont(object.font, object.text, object.bold).then(() => {
      if (!alive) return;
      setReadyKey(fontKey);
      labelRef.current?.getLayer()?.batchDraw();
      onLoaded();
    });
    return () => {
      alive = false;
    };
    // 글꼴 · 글자 · 굵기가 바뀔 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontKey]);

  // 그려 본 뒤의 크기를 에디터에 알린다 (× 버튼 자리 · 되돌리기 없이)
  useEffect(() => {
    const node = labelRef.current;
    if (!node || !fontReady) return;
    const width = node.width();
    const height = node.height();
    if (Math.abs(width - object.width) > 1 || Math.abs(height - object.height) > 1) onMeasure(width, height);
  });

  function onDragEnd(event: KonvaEventObject<DragEvent>) {
    const node = event.target;
    onChange({ ...object, x: node.x(), y: node.y() });
  }

  function onTransformEnd(event: KonvaEventObject<Event>) {
    const node = event.target;
    const scale = node.scaleX();
    node.scaleX(1);
    node.scaleY(1);
    onChange({ ...object, x: node.x(), y: node.y(), rotation: node.rotation(), fontSize: Math.max(16, Math.round(object.fontSize * scale)) });
  }

  return (
    <Label
      ref={(node) => {
        labelRef.current = node;
        register(node);
      }}
      x={object.x}
      y={object.y}
      rotation={object.rotation}
      draggable
      onMouseDown={onPress}
      onTouchStart={onPress}
      onClick={onTap}
      onTap={onTap}
      onDragStart={onMoving}
      onTransformStart={onMoving}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    >
      <Tag fill={object.background ?? undefined} cornerRadius={object.fontSize * 0.2} />
      {/* key — 글꼴이 불리면 글자를 새로 만들어 너비를 다시 잰다 (Konva 는 글꼴이 바뀌어도 잰 너비를 그대로 쓴다) */}
      <Text
        key={fontReady ? "ready" : "loading"}
        text={object.text}
        fontFamily={font.family}
        fontSize={object.fontSize}
        fontStyle={object.bold ? "bold" : "normal"}
        fill={object.fill}
        stroke={object.stroke ?? undefined}
        strokeWidth={object.stroke ? object.fontSize * 0.08 : 0}
        fillAfterStrokeEnabled
        padding={object.background ? object.fontSize * 0.25 : 0}
        align="center"
        lineHeight={1.3}
      />
    </Label>
  );
}
