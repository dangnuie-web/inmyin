"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPost } from "@/app/(flow)/my/inmyin/new/actions";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import type { GridColumns } from "@/components/inventory/Slot";
import { resizeImage } from "@/lib/image/resize";
import { CANVAS_HEIGHT, CANVAS_WIDTH, emptyDocument, fitCanvas, MAX_OBJECTS, placeNew, type CanvasBackground, type CanvasDocument, type CanvasObject } from "@/lib/inmyin/canvas";
import type { PostItemArea } from "@/lib/inmyin/rules";
import { stickerSrc } from "@/lib/inmyin/stickers";
import { uploadCanvasPhotos, uploadPostImage } from "@/lib/inmyin/upload";
import type { PackingInventory, SlotEntry } from "@/lib/inventory/queries";
// Canvas.tsx 에서 값을 가져오면 Konva 가 서버 묶음에 딸려 온다 — 타입만 가져온다
import type { CaptureFn, OverlayRect } from "./Canvas";
import { AddSheet, type AddTab } from "./AddSheet";
import { ItemPicker } from "./ItemPicker";
import { PostForm, type PostLabel } from "./PostForm";
import { PreviewScreen } from "./PreviewScreen";
import { loadImageSize } from "./useImage";

// 캔버스 라이브러리(Konva)는 브라우저에서만 돈다 — 서버에서는 그리지 않고 브라우저에서 불러온다
const Canvas = dynamic(() => import("./Canvas").then((module) => module.Canvas), { ssr: false });

// 되돌리기로 돌아갈 수 있는 걸음 수
const HISTORY_LIMIT = 50;
// 갤러리 사진은 캔버스 폭까지만 줄여서 올린다 — 폰 사진 원본은 너무 크다
const PHOTO_MAX_SIDE = CANVAS_WIDTH;

// 헤더 오른쪽의 버튼들. 그림은 피그마에서 받은 파일 (public/icons/editor). 스티커 · 사진은 ＋ 판 안으로 들어갔다 —
// 아이콘을 더 늘리지 않는다 (인스타 스토리처럼 ＋ 하나)
const TOOLS = {
  undo: { icon: "undo", label: "되돌리기" },
  capture: { icon: "capture", label: "이미지 만들기" },
  broom: { icon: "broom", label: "전부 지우기" },
} as const;

// 캔버스의 모습 하나 — 되돌리기는 이것을 통째로 기억한다
type Snapshot = { background: CanvasBackground; objects: CanvasObject[] };

type EditorProps = {
  inventories: PackingInventory[];
  columns: GridColumns;
  // 저장소의 내 폴더 이름
  userId: string;
};

// 에디터(M-09) → 이미지(M-10) → 포스팅(M-11). 한 화면 안에서 오간다 — 캔버스는 그대로 남아 있다
type Step = "edit" | "preview" | "post";

// M-09 · INMYIN 에디터. 위는 캔버스, 아래(웹은 오른쪽)는 아이템 고르기. 칸을 누르면 캔버스에 올라간다.
// 캔버스 위의 것은 누르면 골라지고(테두리 · 손잡이 · ×), 이미 고른 것을 다시 누르면 앞뒤 순서 메뉴가 뜬다.
// 모든 변화는 되돌리기 기록에 쌓인다 — 전부 지우기도 되돌릴 수 있어서 따로 묻지 않는다
export function Editor({ inventories, columns, userId }: EditorProps) {
  const [{ background, objects }, setSnapshot] = useState<Snapshot>(() => {
    const { background, objects } = emptyDocument();
    return { background, objects };
  });
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayRect | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<AddTab | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const photoInput = useRef<HTMLInputElement>(null);
  // 캔버스에 올린 갤러리 사진의 파일. 포스팅할 때 저장소에 올린다 (그전엔 브라우저 안 주소 blob: 로만 보인다)
  const photoBlobs = useRef(new Map<string, Blob>());
  const captureRef = useRef<CaptureFn | null>(null);
  const [step, setStep] = useState<Step>("edit");
  const [captured, setCaptured] = useState<{ blob: Blob; url: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

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
    setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), { background, objects }]);
    setSnapshot({ background, objects: next });
    lastWasBackground.current = false;
  }

  // 배경은 견본을 연달아 누르며 고르므로, 연이은 배경 바꾸기는 되돌리기 한 걸음으로 묶는다 (첫 번만 기록에 쌓는다)
  const lastWasBackground = useRef(false);
  function applyBackground(next: CanvasBackground) {
    if (!lastWasBackground.current) setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), { background, objects }]);
    lastWasBackground.current = true;
    setSnapshot({ background: next, objects });
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setSnapshot(previous);
    lastWasBackground.current = false;
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
    const src = URL.createObjectURL(blob);
    await add({ kind: "photo", src });
    // add 가 만든 개체의 id 를 몰라서 주소로 찾는다
    setSnapshot((current) => {
      const object = current.objects.find((candidate) => candidate.src === src);
      if (object) photoBlobs.current.set(object.id, blob);
      return current;
    });
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

  // 물건만 지운다 — 배경은 남는다 (배경은 ＋ › 배경에서 바꾼다)
  function clearAll() {
    if (objects.length === 0) return;
    apply([]);
    setSelectedId(null);
    setMenuOpen(false);
    setNotice("전부 지웠어요. 되돌리기로 돌아올 수 있어요.");
  }

  const placedItemIds = new Set(objects.flatMap((object) => (object.itemId ? [object.itemId] : [])));

  // 이미지 만들기 (→ M-10). 손잡이를 풀고 화면이 다시 그려진 뒤에 캔버스를 통째로 JPG 로 뽑는다 — 1080×1350
  async function makeImage() {
    if (objects.length === 0) return setNotice("캔버스에 무엇이든 올린 뒤 만들어 주세요.");
    setSelectedId(null);
    setMenuOpen(false);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const blob = await captureRef.current!(CANVAS_WIDTH / size.width);
      if (captured) URL.revokeObjectURL(captured.url);
      setCaptured({ blob, url: URL.createObjectURL(blob) });
      setStep("preview");
    } catch {
      setNotice("이미지를 만들지 못했어요. 다시 시도해 주세요.");
    }
  }

  // JPG 저장 — 폰은 공유 시트(사진에 저장 · 카톡…), 컴퓨터는 내려받기
  async function saveImage() {
    if (!captured) return;
    const file = new File([captured.blob], "inmyin.jpg", { type: "image/jpeg" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch {
        // 공유 시트를 닫은 것 — 아무 일도 아니다
      }
      return;
    }
    const link = document.createElement("a");
    link.href = captured.url;
    link.download = "inmyin.jpg";
    link.click();
  }

  // 캔버스에 올린 아이템 → 게시물의 탭 영역 (캔버스에 대한 비율). 같은 아이템을 두 번 올렸으면 큰 쪽만
  function itemAreas(): PostItemArea[] {
    const areas = new Map<string, PostItemArea>();
    for (const object of objects) {
      if (!object.itemId) continue;
      const area = { itemId: object.itemId, x: object.x / CANVAS_WIDTH, y: object.y / CANVAS_HEIGHT, w: object.width / CANVAS_WIDTH, h: object.height / CANVAS_HEIGHT };
      const previous = areas.get(object.itemId);
      if (!previous || previous.w * previous.h < area.w * area.h) areas.set(object.itemId, area);
    }
    return Array.from(areas.values()).map((area) => ({
      itemId: area.itemId,
      x: clamp(area.x),
      y: clamp(area.y),
      w: clamp(area.w),
      h: clamp(area.h),
    }));
  }

  const itemNames = new Map(inventories.flatMap((inventory) => inventory.entries.map((entry) => [entry.id, entry.name] as const)));
  const labels: PostLabel[] = itemAreas().map((area) => ({ ...area, name: itemNames.get(area.itemId) ?? "" }));

  // 포스팅 (M-11). 완성 이미지와 갤러리 사진을 저장소에 올린 뒤 서버에 한 줄 적는다. 끝나면 서버가 내 프로필로 보낸다
  async function submitPost(title: string, description: string) {
    if (!captured || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      const postId = crypto.randomUUID();
      const document: CanvasDocument = { version: 1, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background, objects };
      const [canvas] = await Promise.all([uploadCanvasPhotos(document, photoBlobs.current, userId, postId), uploadPostImage(captured.blob, userId, postId)]);
      const result = await createPost({ id: postId, title, description, canvas, items: itemAreas() });
      if (result?.error) setPostError(result.error);
    } catch {
      setPostError("이미지를 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPosting(false);
    }
  }

  if (step === "preview" && captured) {
    return <PreviewScreen imageUrl={captured.url} onClose={() => setStep("edit")} onPost={() => setStep("post")} onSave={saveImage} />;
  }
  if (step === "post" && captured) {
    return <PostForm imageUrl={captured.url} labels={labels} pending={posting} error={postError} onClose={() => setStep("preview")} onSubmit={submitPost} />;
  }

  const toolbar = (
    <div className="flex items-center gap-4">
      <ToolButton tool="undo" onClick={undo} disabled={history.length === 0} />
      {/* ＋ — 스티커 · 사진 · 텍스트 · 배경이 든 판. 피그마의 plus 아이콘을 헤더 아이콘 크기(24)로 */}
      <button type="button" onClick={() => setSheet("stickers")} aria-label="더하기" className="flex size-6 items-center justify-center active:opacity-60">
        <Icon name="plusBold" />
      </button>
      <ToolButton tool="broom" onClick={clearAll} disabled={objects.length === 0} />
      <ToolButton tool="capture" onClick={makeImage} />
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
              <Canvas background={background} objects={objects} width={size.width} height={size.height} selectedId={selectedId} onPress={press} onTap={tap} onChange={change} onOverlay={setOverlay} captureRef={captureRef} />

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
      {sheet && (
        <AddSheet
          tab={sheet}
          onTab={setSheet}
          background={background}
          onBackground={applyBackground}
          onSticker={addSticker}
          onPhoto={() => {
            setSheet(null);
            photoInput.current?.click();
          }}
          onClose={() => setSheet(null)}
        />
      )}
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

// 비율은 0~1 사이로 — 캔버스 밖으로 조금 나간 것도 안으로
function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}
