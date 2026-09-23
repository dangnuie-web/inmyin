"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { SoonButton } from "@/components/profile/SoonButton";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Toast } from "@/components/ui/Toast";
import type { GridColumns } from "@/components/inventory/Slot";
import { resizeImage } from "@/lib/image/resize";
import { CANVAS_WIDTH, fitCanvas, MAX_OBJECTS, placeNew, type CanvasObject } from "@/lib/inmyin/canvas";
import { stickerSrc } from "@/lib/inmyin/stickers";
import type { PackingInventory, SlotEntry } from "@/lib/inventory/queries";
// Canvas.tsx 에서 값을 가져오면 Konva 가 서버 묶음에 딸려 온다 — 타입만 가져온다
import type { OverlayRect } from "./Canvas";
import { ItemPicker } from "./ItemPicker";
import { StickerSheet } from "./StickerSheet";
import { loadImageSize } from "./useImage";

// 캔버스 라이브러리(Konva)는 브라우저에서만 돈다 — 서버에서는 그리지 않고 브라우저에서 불러온다
const Canvas = dynamic(() => import("./Canvas").then((module) => module.Canvas), { ssr: false });

// 되돌리기로 돌아갈 수 있는 걸음 수
const HISTORY_LIMIT = 50;
// 갤러리 사진은 캔버스 폭까지만 줄여서 올린다 — 폰 사진 원본은 너무 크다
const PHOTO_MAX_SIDE = CANVAS_WIDTH;

// 헤더 오른쪽의 버튼들. 그림은 피그마에서 받은 파일 (public/icons/editor)
const TOOLS = {
  undo: { icon: "undo", label: "되돌리기" },
  sticker: { icon: "sticker", label: "스티커" },
  photo: { icon: "photo", label: "사진 올리기" },
  capture: { icon: "capture", label: "이미지 만들기" },
  broom: { icon: "broom", label: "전부 지우기" },
} as const;

type EditorProps = {
  inventories: PackingInventory[];
  columns: GridColumns;
};

// M-09 · INMYIN 에디터. 위는 캔버스, 아래(웹은 오른쪽)는 아이템 고르기. 칸을 누르면 캔버스에 올라간다.
// 캔버스 위의 것은 누르면 골라지고(테두리 · 손잡이 · ×), 이미 고른 것을 다시 누르면 앞뒤 순서 메뉴가 뜬다.
// 모든 변화는 되돌리기 기록에 쌓인다 — 전부 지우기도 되돌릴 수 있어서 따로 묻지 않는다
export function Editor({ inventories, columns }: EditorProps) {
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [history, setHistory] = useState<CanvasObject[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayRect | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<"stickers" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const photoInput = useRef<HTMLInputElement>(null);

  // 캔버스 상자의 크기를 재서 4:5 로 맞춘다. 창 크기가 바뀌면 다시
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize(fitCanvas(width, height));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 바꾸기 전의 모습을 기록에 쌓고 바꾼다
  function apply(next: CanvasObject[]) {
    setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), objects]);
    setObjects(next);
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setObjects(previous);
    setSelectedId(null);
    setMenuOpen(false);
  }

  async function add(base: Pick<CanvasObject, "kind" | "src" | "itemId">) {
    if (objects.length >= MAX_OBJECTS) return setNotice(`캔버스에는 ${MAX_OBJECTS}개까지 올릴 수 있어요.`);
    try {
      const { width, height } = await loadImageSize(base.src);
      const object = placeNew(base, width, height, objects.length);
      apply([...objects, object]);
      setSelectedId(object.id);
      setMenuOpen(false);
    } catch {
      setNotice("이미지를 불러오지 못했어요.");
    }
  }

  function addItem(entry: SlotEntry) {
    if (!entry.imageUrl) return;
    add({ kind: "item", itemId: entry.id, src: entry.imageUrl });
  }

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    const blob = await resizeImage(file, PHOTO_MAX_SIDE);
    add({ kind: "photo", src: URL.createObjectURL(blob) });
  }

  function addSticker(code: string) {
    setSheet(null);
    add({ kind: "sticker", src: stickerSrc(code) });
  }

  // 캔버스가 옮기기 · 키우기 · 돌리기를 끝냈을 때
  function change(changed: CanvasObject) {
    apply(objects.map((object) => (object.id === changed.id ? changed : object)));
  }

  // 누르는 순간 골라진다 (그래야 바로 끌 수 있다). 이미 골라져 있던 것을 끌지 않고 눌렀다 떼면 순서 메뉴
  const pressedSelected = useRef(false);
  function press(id: string | null) {
    pressedSelected.current = id !== null && id === selectedId;
    if (id === selectedId) return;
    setSelectedId(id);
    setMenuOpen(false);
  }

  function tap(id: string) {
    if (pressedSelected.current && id === selectedId) setMenuOpen((open) => !open);
  }

  function remove() {
    if (!selectedId) return;
    apply(objects.filter((object) => object.id !== selectedId));
    setSelectedId(null);
    setMenuOpen(false);
  }

  // 맨 앞 = 목록의 맨 뒤 (나중에 그린 것이 위에 보인다)
  function reorder(where: "front" | "back") {
    const target = objects.find((object) => object.id === selectedId);
    if (!target) return;
    const rest = objects.filter((object) => object.id !== selectedId);
    apply(where === "front" ? [...rest, target] : [target, ...rest]);
    setMenuOpen(false);
  }

  function clearAll() {
    if (objects.length === 0) return;
    apply([]);
    setSelectedId(null);
    setMenuOpen(false);
    setNotice("전부 지웠어요. 되돌리기로 돌아올 수 있어요.");
  }

  const placedItemIds = new Set(objects.flatMap((object) => (object.itemId ? [object.itemId] : [])));

  const toolbar = (
    <div className="flex items-center gap-4">
      <ToolButton tool="undo" onClick={undo} disabled={history.length === 0} />
      <ToolButton tool="sticker" onClick={() => setSheet("stickers")} />
      <ToolButton tool="photo" onClick={() => photoInput.current?.click()} />
      {/* 이미지 만들기(M-10)는 다음 항목 */}
      <SoonButton notice="이미지 만들기는 다음 항목에서 만들어요." className="active:opacity-60">
        <ToolIcon tool="capture" />
      </SoonButton>
      <ToolButton tool="broom" onClick={clearAll} disabled={objects.length === 0} />
    </div>
  );

  return (
    // 폰: 화면 높이를 다 쓰고 페이지는 스크롤하지 않는다 (짐싸기와 같다). 웹: 상단 메뉴(h-19) 아래를 다 쓰고 캔버스 · 고르기가 나란히
    <main className="mx-auto flex h-dvh w-full max-w-md flex-col pb-[env(safe-area-inset-bottom)] lg:h-[calc(100dvh-4.75rem)] lg:max-w-web lg:flex-row lg:gap-8 lg:pb-6">
      <div className="flex min-h-0 flex-1 flex-col">
        <HeaderMini icon="back" href="/my" title="INMYIN" action={toolbar} />

        {/* 캔버스 상자. 자식(캔버스)은 이 상자에 4:5 로 맞춘 크기 */}
        <div ref={box} className="relative flex min-h-0 flex-1 items-center justify-center px-5 py-3">
          {size.width > 0 && (
            <div className="relative shadow-[0_0_0_1px_var(--color-border)]" style={{ width: size.width, height: size.height }}>
              <Canvas objects={objects} width={size.width} height={size.height} selectedId={selectedId} onPress={press} onTap={tap} onChange={change} onOverlay={setOverlay} />

              {objects.length === 0 && (
                <p className="pointer-events-none absolute inset-0 flex items-center justify-center px-8 text-center text-label text-ink-muted">
                  아래에서 아이템을 누르면 여기에 올라와요.
                </p>
              )}

              {/* 고른 것의 오른쪽 위 × 와, 다시 눌렀을 때의 순서 메뉴 (피그마 M-09) */}
              {selectedId && overlay && (
                <>
                  <button
                    type="button"
                    onClick={remove}
                    aria-label="지우기"
                    className="absolute z-10 flex size-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-ink bg-white text-body leading-none active:opacity-60"
                    style={{ left: Math.min(overlay.x + overlay.width, size.width - 12), top: Math.max(overlay.y, 12) }}
                  >
                    ×
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute z-10 flex flex-col gap-2 rounded-sm bg-dropdown p-2 text-label font-semibold text-gray-1"
                      style={{ left: Math.min(overlay.x + overlay.width + 8, size.width - 130), top: Math.min(overlay.y + overlay.height / 2, size.height - 70) }}
                    >
                      <button type="button" role="menuitem" onClick={() => reorder("back")} className="whitespace-nowrap text-left active:opacity-60">
                        맨 뒤로 보내기
                      </button>
                      <button type="button" role="menuitem" onClick={() => reorder("front")} className="whitespace-nowrap text-left active:opacity-60">
                        맨 앞으로 보내기
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 폰: 아래 절반쯤. 웹: 오른쪽 기둥 */}
      <div className="flex h-[42dvh] shrink-0 flex-col lg:h-auto lg:w-[478px] lg:rounded-lg lg:bg-gray-1 lg:pt-3">
        <ItemPicker inventories={inventories} columns={columns} placedItemIds={placedItemIds} onPick={addItem} />
      </div>

      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          addPhoto(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {sheet === "stickers" && <StickerSheet onPick={addSticker} onClose={() => setSheet(null)} />}
      <Toast message={notice} onDone={hideNotice} />
    </main>
  );
}

function ToolIcon({ tool }: { tool: keyof typeof TOOLS }) {
  return <Image src={`/icons/editor/${TOOLS[tool].icon}.png`} alt="" width={24} height={24} unoptimized className="size-6" />;
}

function ToolButton({ tool, onClick, disabled = false }: { tool: keyof typeof TOOLS; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={TOOLS[tool].label} className="active:opacity-60 disabled:opacity-30">
      <ToolIcon tool={tool} />
    </button>
  );
}
