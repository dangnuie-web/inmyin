"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { clampView, pinchView, stamp, strokePoints, unionRect, type BrushMode, type Rect, type View } from "@/lib/image/retouch";

type CutoutRetouchProps = {
  // 배경을 지우기 전 원래 사진 — 살리기 붓(지운 곳을 다시 채움)이 여기서 색을 가져온다
  original: File;
  // 손질을 시작할 사진 (배경을 지운 것, 전에 손질했으면 그 결과)
  cutout: File;
  // 처음 자동으로 지운 결과 — "처음 누끼로"
  autoCutout: File;
  onCancel: () => void;
  onDone: (file: File) => void;
  // 폰 뒤로 가기로 닫힐 때 부를 "지금까지 칠한 것 남기기"를 여기에 걸어 둔다 (PhotoEditor → useHistoryLayer onBack)
  keepRef?: React.RefObject<(() => void) | null>;
};

// 붓 크기 세 단계 — 화면에서 보이는 지름(px). 확대해도 화면에서의 크기는 같고, 사진 위에서는 그만큼 가늘어진다
const BRUSHES = [
  { label: "작게", diameter: 16, dot: 6 },
  { label: "보통", diameter: 32, dot: 10 },
  { label: "크게", diameter: 56, dot: 16 },
] as const;
// 되돌리기로 돌아갈 수 있는 획 수
const UNDO_LIMIT = 20;
// 손가락 옆에 띄우는 돋보기 크기(px)와 배율(화면 대비)
const LOUPE = 112;
const LOUPE_ZOOM = 2;
// 사진과 화면 테두리 사이 여백
const PAD = 12;

// 체크 무늬 — 지운 곳(투명)이 보이게. 흑백 토큰만
const CHECKER = {
  backgroundImage:
    "conic-gradient(var(--color-gray-3) 25%, var(--color-white) 0 50%, var(--color-gray-3) 0 75%, var(--color-white) 0)",
  backgroundSize: "16px 16px",
} as const;

type Point = { x: number; y: number };
type Gesture =
  | { kind: "none" }
  | { kind: "paint"; last: [number, number] }
  | { kind: "pinch"; start: View; mid0: [number, number]; dist0: number }
  // 두 손가락을 떼는 중 — 남은 손가락으로 칠하지 않게, 다 뗄 때까지 잠근다
  | { kind: "locked" };

async function pixelsOf(file: File, width?: number, height?: number) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  canvas.width = width ?? bitmap.width;
  canvas.height = height ?? bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

// M-07 누끼 손질 — 배경제거가 덜 지운 곳은 지우기 붓으로, 너무 지운 곳은 살리기 붓(원래 사진 색을 다시 채움)으로.
// 한 손가락은 칠하기, 두 손가락은 확대 · 이동(칠하던 획은 취소). 컴퓨터는 마우스로 칠하고 휠로 확대.
// 손가락에 가려도 보이게 붓 크기 원을 띄우고, 위쪽 구석에 붓 자리를 키운 돋보기를 띄운다.
// 사진 크기는 배경제거 결과 그대로(긴 변 640 — 썸네일 크기)라 큰 사진에서도 한 번에 고치는 양이 작다
export function CutoutRetouch({ original, cutout, autoCutout, onCancel, onDone, keepRef }: CutoutRetouchProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);

  // 손질 중인 픽셀 · 원래 사진 픽셀(같은 크기) · 처음 누끼 픽셀
  const workRef = useRef<ImageData | null>(null);
  const originalRef = useRef<Uint8ClampedArray | null>(null);
  const autoRef = useRef<Uint8ClampedArray | null>(null);
  const undoRef = useRef<Uint8ClampedArray[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState<BrushMode>("erase");
  const [brush, setBrush] = useState(1);
  // 화면 칸(box)의 크기와, 그 안에 맞춘 사진 크기
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  // 이벤트 · 그리기에서 지금 값을 읽으려고 따로 들고 있는 것들 (그린 뒤에 맞춰 둔다 — 아래 useLayoutEffect)
  const viewRef = useRef(view);
  const brushRef = useRef(brush);
  const fitRef = useRef({ width: 0, height: 0 });
  const baseRef = useRef({ x: 0, y: 0 });
  // 붓 크기 원 (화면 칸 안 좌표). null 이면 안 보임
  const [ring, setRing] = useState<Point | null>(null);
  const [loupeSide, setLoupeSide] = useState<"left" | "right" | null>(null);

  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture>({ kind: "none" });
  const dirtyRef = useRef<Rect | null>(null);
  const frameRef = useRef(0);
  const lastPointRef = useRef<Point | null>(null);

  // 사진 셋을 같은 크기 픽셀로 읽는다. 원래 사진은 누끼 크기로 줄여 그린다 (배경제거가 같은 크기로 줄여서 지운다)
  useEffect(() => {
    let alive = true;
    (async () => {
      const work = await pixelsOf(cutout);
      const [orig, auto] = await Promise.all([pixelsOf(original, work.width, work.height), pixelsOf(autoCutout, work.width, work.height)]);
      if (!alive) return;
      workRef.current = work;
      originalRef.current = orig.data;
      autoRef.current = auto.data;
      setSize({ width: work.width, height: work.height });
    })().catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [original, cutout, autoCutout]);

  // 화면 칸 크기 재기
  useLayoutEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 사진을 칸 안에 맞춘 크기 (배율 1)
  const fit = (() => {
    if (!size || !box.width) return { width: 0, height: 0 };
    const k = Math.min((box.width - PAD * 2) / size.width, (box.height - PAD * 2) / size.height);
    return { width: size.width * k, height: size.height * k };
  })();
  const base = { x: (box.width - fit.width) / 2, y: (box.height - fit.height) / 2 };

  useLayoutEffect(() => {
    viewRef.current = view;
    brushRef.current = brush;
    fitRef.current = fit;
    baseRef.current = base;
  });

  // 처음 그리기 — 캔버스는 사진과 칸 크기를 둘 다 안 뒤에 붙는다
  const shown = !!size && fit.width > 0;
  useEffect(() => {
    const canvas = canvasRef.current;
    const work = workRef.current;
    if (!shown || !canvas || !work) return;
    canvas.width = work.width;
    canvas.height = work.height;
    canvas.getContext("2d")!.putImageData(work, 0, 0);
  }, [shown]);

  // 화면 1px 가 사진 몇 px 인지의 반대 — 사진 1px 가 화면에서 몇 px 인지
  const screenPerImage = useCallback(() => {
    const work = workRef.current;
    return work ? (fitRef.current.width * viewRef.current.scale) / work.width : 1;
  }, []);

  const drawLoupe = useCallback(
    (center: [number, number] | null) => {
      const loupe = loupeRef.current;
      const canvas = canvasRef.current;
      if (!loupe || !canvas || !center) return;
      const context = loupe.getContext("2d")!;
      const ratio = window.devicePixelRatio || 1;
      if (loupe.width !== LOUPE * ratio) {
        loupe.width = LOUPE * ratio;
        loupe.height = LOUPE * ratio;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      // 체크 바탕
      for (let y = 0; y < LOUPE; y += 8) {
        for (let x = 0; x < LOUPE; x += 8) {
          context.fillStyle = (x + y) % 16 === 0 ? "#ffffff" : "#d9d9d9";
          context.fillRect(x, y, 8, 8);
        }
      }
      const perImage = screenPerImage() * LOUPE_ZOOM;
      const side = LOUPE / perImage;
      context.imageSmoothingEnabled = perImage < 4;
      context.drawImage(canvas, center[0] - side / 2, center[1] - side / 2, side, side, 0, 0, LOUPE, LOUPE);
      // 붓 크기 원
      context.strokeStyle = "#000000";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(LOUPE / 2, LOUPE / 2, (BRUSHES[brushRef.current].diameter / 2) * LOUPE_ZOOM, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(LOUPE / 2, LOUPE / 2, (BRUSHES[brushRef.current].diameter / 2) * LOUPE_ZOOM - 1.5, 0, Math.PI * 2);
      context.stroke();
    },
    [screenPerImage],
  );
  const loupeCenterRef = useRef<[number, number] | null>(null);

  // 고친 곳만 다시 그린다 — 한 프레임에 한 번
  const flush = useCallback(() => {
    frameRef.current = 0;
    const canvas = canvasRef.current;
    const work = workRef.current;
    const dirty = dirtyRef.current;
    if (canvas && work && dirty) canvas.getContext("2d")!.putImageData(work, 0, 0, dirty.x, dirty.y, dirty.width, dirty.height);
    dirtyRef.current = null;
    drawLoupe(loupeCenterRef.current);
  }, [drawLoupe]);

  const schedule = useCallback(
    (rect: Rect | null) => {
      dirtyRef.current = unionRect(dirtyRef.current, rect);
      if (!frameRef.current) frameRef.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  function redrawAll() {
    const work = workRef.current;
    if (work) schedule({ x: 0, y: 0, width: work.width, height: work.height });
  }

  // 화면 칸 안 좌표 → 사진 픽셀 좌표
  function toImage(point: Point): [number, number] {
    const work = workRef.current!;
    const v = viewRef.current;
    const k = work.width / fitRef.current.width;
    return [((point.x - baseRef.current.x - v.x) / v.scale) * k, ((point.y - baseRef.current.y - v.y) / v.scale) * k];
  }

  function radiusOnImage() {
    return BRUSHES[brushRef.current].diameter / 2 / screenPerImage();
  }

  function paintTo(target: [number, number]) {
    const work = workRef.current;
    const orig = originalRef.current;
    const gesture = gestureRef.current;
    if (!work || !orig || gesture.kind !== "paint") return;
    const radius = radiusOnImage();
    let rect: Rect | null = null;
    for (const [x, y] of strokePoints(gesture.last[0], gesture.last[1], target[0], target[1], radius)) {
      rect = unionRect(rect, stamp(work.data, orig, work.width, work.height, x, y, radius, mode));
    }
    gesture.last = target;
    loupeCenterRef.current = target;
    schedule(rect);
  }

  function local(event: { clientX: number; clientY: number }): Point {
    const rect = boxRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function showRing(point: Point) {
    setRing(point);
    lastPointRef.current = point;
  }

  function pushUndo() {
    const work = workRef.current;
    if (!work) return;
    undoRef.current.push(work.data.slice());
    if (undoRef.current.length > UNDO_LIMIT) undoRef.current.shift();
    setUndoCount(undoRef.current.length);
  }

  function twoFingers(): [Point, Point] {
    const [a, b] = [...pointersRef.current.values()];
    return [a, b];
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!workRef.current || saving) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = local(event);
    pointersRef.current.set(event.pointerId, point);
    const gesture = gestureRef.current;

    if (pointersRef.current.size === 1 && gesture.kind === "none") {
      pushUndo();
      const start = toImage(point);
      // 같은 자리에서 시작해 점 하나라도 찍히게
      gestureRef.current = { kind: "paint", last: start };
      const work = workRef.current;
      const radius = radiusOnImage();
      loupeCenterRef.current = start;
      schedule(stamp(work.data, originalRef.current!, work.width, work.height, start[0], start[1], radius, mode));
      showRing(point);
      setLoupeSide(point.x < box.width / 2 ? "right" : "left");
      return;
    }

    if (pointersRef.current.size === 2) {
      // 두 번째 손가락 — 칠하던 획은 확대하려던 것이었으니 취소한다
      if (gesture.kind === "paint") {
        const previous = undoRef.current.pop();
        if (previous) workRef.current.data.set(previous);
        setUndoCount(undoRef.current.length);
        redrawAll();
      }
      const [a, b] = twoFingers();
      gestureRef.current = {
        kind: "pinch",
        start: viewRef.current,
        mid0: [(a.x + b.x) / 2 - baseRef.current.x, (a.y + b.y) / 2 - baseRef.current.y],
        dist0: Math.hypot(a.x - b.x, a.y - b.y),
      };
      setRing(null);
      setLoupeSide(null);
      loupeCenterRef.current = null;
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const point = local(event);
    const gesture = gestureRef.current;
    if (!pointersRef.current.has(event.pointerId)) {
      // 마우스를 올려만 둔 것 — 붓 크기 원만 따라다닌다
      if (event.pointerType === "mouse" && workRef.current) showRing(point);
      return;
    }
    pointersRef.current.set(event.pointerId, point);

    if (gesture.kind === "pinch" && pointersRef.current.size >= 2) {
      const [a, b] = twoFingers();
      const next = pinchView(
        gesture.start,
        gesture.mid0,
        gesture.dist0,
        [(a.x + b.x) / 2 - baseRef.current.x, (a.y + b.y) / 2 - baseRef.current.y],
        Math.hypot(a.x - b.x, a.y - b.y),
      );
      setView(clampView(next, box.width, box.height, fitRef.current.width, fitRef.current.height));
      return;
    }
    if (gesture.kind === "paint") {
      // 빠른 손가락은 사이 이벤트를 묶어 보낸다 — 다 이어서 칠한다
      const events = event.nativeEvent.getCoalescedEvents?.() ?? [];
      for (const e of events.length ? events : [event.nativeEvent]) paintTo(toImage(local(e)));
      showRing(point);
      setLoupeSide(point.x < box.width / 2 ? "right" : "left");
    }
  }

  function onPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.delete(event.pointerId)) return;
    const gesture = gestureRef.current;
    const left = pointersRef.current.size;
    if (gesture.kind === "paint") {
      gestureRef.current = { kind: "none" };
      setLoupeSide(null);
      loupeCenterRef.current = null;
      if (event.pointerType !== "mouse") setRing(null);
    } else if (gesture.kind === "pinch" || gesture.kind === "locked") {
      gestureRef.current = left === 0 ? { kind: "none" } : { kind: "locked" };
    }
  }

  // 컴퓨터 — 휠로 확대 · 축소 (마우스 자리를 기준으로). React 의 휠은 수동(passive)이라 화면 스크롤을 못 막아 직접 단다
  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = element!.getBoundingClientRect();
      const point: [number, number] = [event.clientX - rect.left - baseRef.current.x, event.clientY - rect.top - baseRef.current.y];
      const factor = Math.exp(-event.deltaY / 300);
      const next = pinchView(viewRef.current, point, 1, point, factor);
      setView(clampView(next, rect.width, rect.height, fitRef.current.width, fitRef.current.height));
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  function onUndo() {
    const previous = undoRef.current.pop();
    if (!previous || !workRef.current) return;
    workRef.current.data.set(previous);
    setUndoCount(undoRef.current.length);
    redrawAll();
  }

  function onReset() {
    if (!workRef.current || !autoRef.current) return;
    pushUndo();
    workRef.current.data.set(autoRef.current);
    redrawAll();
  }

  // 폰 뒤로 가기 — × 가 아니라 완료처럼 칠한 것을 남긴다(가장자리를 쓸다 뒤로 가기가 되어도 잃지 않게, 묻지 않는다).
  // 한 획도 안 칠했으면 남길 것이 없다. 화면은 바로 닫히고 파일은 뒤에서 만들어 onDone 으로 넘긴다
  useEffect(() => {
    if (!keepRef) return;
    keepRef.current = () => {
      if (undoRef.current.length > 0) void onFinish();
    };
    return () => {
      keepRef.current = null;
    };
  });

  async function onFinish() {
    const work = workRef.current;
    if (!work) return;
    setSaving(true);
    const canvas = document.createElement("canvas");
    canvas.width = work.width;
    canvas.height = work.height;
    canvas.getContext("2d")!.putImageData(work, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return setSaving(false);
      onDone(new File([blob], "cutout-retouched.png", { type: "image/png" }));
    }, "image/png");
  }

  const ringDiameter = BRUSHES[brush].diameter;

  return (
    <div role="dialog" aria-modal aria-label="누끼 손질" className="fixed inset-0 z-50 bg-ink text-white">
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <HeaderMini
          icon="close"
          onClick={onCancel}
          title="손질"
          tone="dark"
          action={
            <button type="button" onClick={onFinish} disabled={!size || saving} className="text-label font-bold active:opacity-60 disabled:opacity-40">
              완료
            </button>
          }
        />

        {/* 칠하는 곳. touch-none — 손가락 움직임을 화면 스크롤 · 확대가 가져가지 않게 */}
        <div
          ref={boxRef}
          className="relative min-h-0 flex-1 touch-none select-none overflow-hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={(event) => event.pointerType === "mouse" && !pointersRef.current.size && setRing(null)}
          onContextMenu={(event) => event.preventDefault()}
        >
          {shown && (
            <div
              className="absolute origin-top-left"
              style={{ left: base.x, top: base.y, width: fit.width, height: fit.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            >
              <canvas ref={canvasRef} className="block size-full" style={CHECKER} />
            </div>
          )}
          {!size && !failed && <p className="absolute inset-0 flex items-center justify-center text-label">사진을 여는 중…</p>}
          {failed && <p className="absolute inset-0 flex items-center justify-center text-label">사진을 열지 못했어요.</p>}

          {/* 붓 크기 원 — 검은 선 + 흰 선 두 겹이라 어떤 바탕에서도 보인다 */}
          {ring && (
            <span
              aria-hidden
              className="pointer-events-none absolute rounded-full border-[1.5px] border-ink shadow-[inset_0_0_0_1px_white,0_0_0_1px_white]"
              style={{ left: ring.x - ringDiameter / 2, top: ring.y - ringDiameter / 2, width: ringDiameter, height: ringDiameter }}
            />
          )}

          {/* 돋보기 — 손가락에 가린 붓 자리를 키워 보여 준다. 손가락 반대쪽 위 구석 */}
          <canvas
            ref={loupeRef}
            aria-hidden
            className={`pointer-events-none absolute top-3 size-28 rounded-md border-2 border-white ${loupeSide ? "" : "hidden"} ${
              loupeSide === "left" ? "left-3" : "right-3"
            }`}
          />
        </div>

        <div className="flex flex-col gap-4 px-5 pt-4">
          <div className="flex items-center justify-between">
            {/* 지우기 · 살리기 붓 — 고른 쪽이 흰 채움 (흑백). 이름은 2026-10-21 당니님 결정(지우개 → 지우기, 되살리기 → 살리기) */}
            <div role="radiogroup" aria-label="붓" className="flex gap-2">
              {(
                [
                  ["erase", "eraser", "지우기"],
                  ["restore", "brush", "살리기"],
                ] as const
              ).map(([value, icon, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={`flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-label font-bold active:opacity-80 ${
                    mode === value ? "border-white bg-white text-ink" : "border-gray-4 text-white"
                  }`}
                >
                  <Icon name={icon} scale={0.875} />
                  {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={onUndo} disabled={undoCount === 0} aria-label="되돌리기" className="flex flex-col items-center gap-0.5 active:opacity-60 disabled:opacity-30">
              <Icon name="undo24" />
              <span aria-hidden className="text-[11px] leading-[1.2] font-medium text-gray-mid">
                되돌리기
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div role="radiogroup" aria-label="붓 크기" className="flex items-center gap-1">
              {BRUSHES.map(({ label, dot }, index) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={brush === index}
                  aria-label={`붓 ${label}`}
                  onClick={() => setBrush(index)}
                  className={`flex size-10 items-center justify-center rounded-full active:opacity-80 ${brush === index ? "bg-surface-dark" : ""}`}
                >
                  <span className="rounded-full bg-white" style={{ width: dot, height: dot }} />
                </button>
              ))}
            </div>
            <button type="button" onClick={onReset} disabled={!size} className="text-caption text-gray-mid underline underline-offset-2 active:opacity-60 disabled:opacity-40">
              처음 누끼로
            </button>
          </div>
          <p className="text-caption text-gray-4">한 손가락으로 문지르고, 두 손가락으로 키우고 옮겨요.</p>
        </div>
      </div>
    </div>
  );
}
