"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPost } from "@/app/(flow)/my/inmyin/new/actions";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import type { GridColumns } from "@/components/inventory/Slot";
import { CANVAS_HEIGHT, CANVAS_WIDTH, emptyDocument, fitCanvas, MAX_OBJECTS, placeNew, placeNewText, type CanvasBackground, type CanvasDocument, type CanvasObject, type CanvasTemplate, type ImageObject } from "@/lib/inmyin/canvas";
import { loadTextFont, textFont } from "@/lib/inmyin/fonts";
import type { PostItemArea } from "@/lib/inmyin/rules";
import { stickerSrc } from "@/lib/inmyin/stickers";
import { arrange, detachObject, emptySlots, managedItems, placeText, templateBackground, templateCapacity, type ImageExtent, type TemplateId, type TemplateTextSpec } from "@/lib/inmyin/templates";
import { loadImageExtent } from "@/lib/inmyin/visible-box";
import { uploadCanvasPhotos, uploadPostImage } from "@/lib/inmyin/upload";
import type { PackingInventory, SlotEntry } from "@/lib/inventory/queries";
// Canvas.tsx 에서 값을 가져오면 Konva 가 서버 묶음에 딸려 온다 — 타입만 가져온다
import type { CaptureFn, OverlayRect } from "./Canvas";
import { AddSheet, type AddTab } from "./AddSheet";
import { ItemPicker } from "./ItemPicker";
import { PostForm, type PostLabel } from "./PostForm";
import { DEFAULT_TEXT_STYLE, type TextStyle } from "./TextEditor";
import { PreviewScreen } from "./PreviewScreen";
import { loadImageSize } from "./useImage";

// 캔버스 라이브러리(Konva)는 브라우저에서만 돈다 — 서버에서는 그리지 않고 브라우저에서 불러온다
const Canvas = dynamic(() => import("./Canvas").then((module) => module.Canvas), { ssr: false });

function initialSnapshot(): Snapshot {
  const { background, objects } = emptyDocument();
  return { background, objects, template: null };
}

// 되돌리기로 돌아갈 수 있는 걸음 수
const HISTORY_LIMIT = 50;

// 헤더 오른쪽의 버튼 넷. 그림은 아이콘 세트 v01(2026-10-20 무늬, components/ui/Icon.tsx), 밑에 11px 회색 이름.
// 스티커 · 사진은 ＋ 판 안으로 들어갔다 — 아이콘을 더 늘리지 않는다 (인스타 스토리처럼 ＋ 하나)
const TOOLS = {
  undo: { icon: "undo24", label: "되돌리기" },
  add: { icon: "plus24", label: "추가" },
  // 묻지 않고 지운다 — 되돌리기로 돌아올 수 있고, 지운 뒤 토스트가 그렇게 알린다
  clear: { icon: "trash24", label: "전부 지우기" },
  done: { icon: "done", label: "완성" },
} as const;

// 캔버스의 모습 하나 — 되돌리기는 이것을 통째로 기억한다. template — 고른 틀 (lib/inmyin/templates.ts), 없으면 null
type Snapshot = { background: CanvasBackground; objects: CanvasObject[]; template: CanvasTemplate | null };

type EditorProps = {
  inventories: PackingInventory[];
  columns: GridColumns;
  // 저장소의 내 폴더 이름
  userId: string;
  // 내 아이디 (@ 없이). 틀 글자의 {handle}
  handle: string;
};

// 에디터(M-09) → 이미지(M-10) → 포스팅(M-11). 한 화면 안에서 오간다 — 캔버스는 그대로 남아 있다
type Step = "edit" | "preview" | "post";

// M-09 · INMYIN 에디터. 위는 캔버스, 아래(웹은 오른쪽)는 아이템 고르기. 칸을 누르면 캔버스에 올라간다.
// 캔버스 위의 것은 누르면 골라지고(테두리 · 손잡이 · ×), 이미 고른 것을 다시 누르면 앞뒤 순서 메뉴가 뜬다.
// 모든 변화는 되돌리기 기록에 쌓인다 — 전부 지우기도 되돌릴 수 있어서 따로 묻지 않는다
export function Editor({ inventories, columns, userId, handle }: EditorProps) {
  const [snapshot, setSnapshotState] = useState<Snapshot>(initialSnapshot);
  const { background, objects, template } = snapshot;
  // 늘 가장 새 모습. 아이템 올리기처럼 그림을 기다리는 일은 기다린 뒤 이것을 읽는다 — 그사이 바뀐 것(연달아 누른 아이템 · 끌기)을 덮어쓰지 않게
  const latest = useRef<Snapshot>(snapshot);
  const setSnapshot = useCallback((next: Snapshot | ((current: Snapshot) => Snapshot)) => {
    const value = typeof next === "function" ? next(latest.current) : next;
    latest.current = value;
    setSnapshotState(value);
  }, []);
  // 기다림이 있는 바꾸기(올리기 · 틀 고르기 · 지우기)는 한 줄로 차례차례 — 연달아 눌러도 하나씩
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  function serial(task: () => Promise<unknown>) {
    const run = queue.current.then(task, task);
    queue.current = run.catch(() => undefined);
    return run;
  }
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayRect | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // 빈 캔버스로 들어오면 ＋ 판이 틀 칩이 열린 채 올라온다 (무늬 틀 설계서 v01 5절) — 첫 한 수를 쉽게
  const [sheet, setSheet] = useState<AddTab | null>("templates");
  // 글자를 고치는 중이면 그 글자의 id
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  // 갤러리에서 고른 사진 — ＋ 판의 사진 칩에서 다듬는 중
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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

  // 바꾸기 전의 모습을 기록에 쌓고 바꾼다. 틀 · 배경을 같이 바꿀 때는 changes 로
  function apply(next: CanvasObject[], changes: Partial<Omit<Snapshot, "objects">> = {}) {
    const previous = latest.current;
    setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), previous]);
    setSnapshot({ ...previous, objects: next, ...changes });
    lastWasBackground.current = false;
  }

  // 배경은 견본을 연달아 누르며 고르므로, 연이은 배경 바꾸기는 되돌리기 한 걸음으로 묶는다 (첫 번만 기록에 쌓는다)
  const lastWasBackground = useRef(false);
  function applyBackground(next: CanvasBackground) {
    const previous = latest.current;
    if (!lastWasBackground.current) setHistory((current) => [...current.slice(-(HISTORY_LIMIT - 1)), previous]);
    lastWasBackground.current = true;
    setSnapshot({ ...previous, background: next });
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

  // 그림을 캔버스에. 틀이 있으면 아이템은 다음 자리로 (자리 순서는 맨 뒤 — arrange 가 번호를 다시 매긴다). 돌려주는 것은 올린 개체의 id
  function add(base: Pick<ImageObject, "kind" | "src" | "itemId">) {
    return serial(async () => {
      if (latest.current.objects.length >= MAX_OBJECTS) return setNotice(`캔버스에는 ${MAX_OBJECTS}개까지 올릴 수 있어요.`);
      try {
        const { width, height } = await loadImageSize(base.src);
        const managed = latest.current.template && base.kind === "item";
        if (managed) await prepareTemplate([...latest.current.objects, base as ImageObject]);
        // 여기부터는 기다리지 않는다 — 가장 새 모습 위에 올린다
        const { objects: current, template: currentTemplate } = latest.current;
        const placed = placeNew(base, width, height, current.length);
        const object: ImageObject = managed ? { ...placed, template: { role: "item", slot: Number.MAX_SAFE_INTEGER } } : placed;
        apply(managed && currentTemplate ? arrangeNow([...current, object], currentTemplate) : [...current, object]);
        setSelectedId(object.id);
        setMenuOpen(false);
        return object.id;
      } catch {
        setNotice("이미지를 불러오지 못했어요.");
      }
    });
  }

  // ── 틀 ──────────────────────────────────────────────
  // 그림의 원래 크기 · 보이는 부분 (누끼 여백을 뺀 물건 테두리). arrange 는 기다리지 않으므로 미리 재 둔다
  const extents = useRef(new Map<string, ImageExtent>());
  // 자리 수를 넘쳤다는 알림은 틀을 고를 때마다 한 번만 (2026-10-20 당니님 결정)
  const overflowNoticed = useRef(false);
  const measureContext = useRef<CanvasRenderingContext2D | null>(null);

  const inventoryOfItem = new Map(inventories.flatMap((inventory) => inventory.entries.map((entry) => [entry.id, inventory.name] as const)));
  const itemNameOf = new Map(inventories.flatMap((inventory) => inventory.entries.map((entry) => [entry.id, entry.name] as const)));

  function measureTemplateText(spec: TemplateTextSpec) {
    measureContext.current ??= document.createElement("canvas").getContext("2d");
    const context = measureContext.current;
    if (!context) return spec.fontSize * spec.text.length * 0.6;
    context.font = `${spec.bold ? "bold" : "normal"} ${spec.fontSize}px ${textFont(spec.font).family}`;
    return context.measureText(spec.text).width;
  }

  // 틀대로 놓기 전에 기다릴 것 — 글꼴(글자 폭을 재려고)과 아이템 그림의 보이는 부분
  async function prepareTemplate(list: CanvasObject[]) {
    await Promise.all([
      loadTextFont("pretendard", "What's in my bag 아이템 0123456789", true),
      loadTextFont("pretendard", "아이템 0123456789", false),
      ...list.map(async (object) => {
        if (object.kind !== "item" || extents.current.has(object.src)) return;
        try {
          extents.current.set(object.src, await loadImageExtent(object.src));
        } catch {
          // 못 재면 지금 개체의 비율로 (arrange 가 대신한다)
        }
      }),
    ]);
  }

  // 틀대로 다시 놓은 개체 목록 (기다리지 않는다 — prepareTemplate 를 먼저). 처음 고를 때(gatherAll)는 캔버스의 아이템을 모두 자리로.
  // 제목의 인벤토리 이름 = 첫 자리 아이템이 든 인벤토리 (아이템이 없으면 서랍의 첫 인벤토리)
  function arrangeNow(next: CanvasObject[], nextTemplate: CanvasTemplate, { gatherAll = false } = {}) {
    const items = managedItems(next, gatherAll);
    const first = items[0]?.itemId;
    const result = arrange(nextTemplate, next, {
      inventory: (first && inventoryOfItem.get(first)) || inventories[0]?.name || "",
      handle,
      nameOf: (itemId) => itemNameOf.get(itemId) ?? "",
      extentOf: (object) => extents.current.get(object.src),
      measure: measureTemplateText,
      newId: () => crypto.randomUUID(),
    }, { gatherAll });
    if (result.overflow > 0 && !overflowNoticed.current) {
      overflowNoticed.current = true;
      setNotice(`이 틀은 자리가 ${templateCapacity(nextTemplate.id)}개예요. 나머지는 직접 놓아 주세요.`);
    }
    return result.objects;
  }

  // ＋ 판의 틀 칩에서 고름. 처음 고르면 올려 둔 아이템을 모두 자리로, 다른 틀로 바꾸면 틀이 놓은 것만 새 자리로 (손으로 옮긴 것은 그대로).
  // 배경도 그 틀의 바탕으로. 되돌리기 한 걸음
  function chooseTemplate(id: TemplateId) {
    setSheet(null);
    return serial(async () => {
      if (latest.current.template?.id === id) return;
      await prepareTemplate(latest.current.objects);
      const { objects: current, template: previous } = latest.current;
      const nextTemplate: CanvasTemplate = { id, detached: [] };
      overflowNoticed.current = false;
      apply(arrangeNow(current, nextTemplate, { gatherAll: previous === null }), { template: nextTemplate, background: templateBackground(id) });
      setSelectedId(null);
      setMenuOpen(false);
    });
  }

  function addItem(entry: SlotEntry) {
    if (!entry.imageUrl) return;
    add({ kind: "item", itemId: entry.id, src: entry.imageUrl });
  }

  // 다듬은 사진(원본 · 배경 지움 · 모양대로 자름)을 캔버스에. 파일은 포스팅할 때 저장소에 올리려고 따로 들고 있는다
  async function addPhoto(blob: Blob) {
    setSheet(null);
    setPhotoFile(null);
    const src = URL.createObjectURL(blob);
    const id = await add({ kind: "photo", src });
    if (typeof id === "string") photoBlobs.current.set(id, blob);
  }

  function addSticker(code: string) {
    setSheet(null);
    add({ kind: "sticker", src: stickerSrc(code) });
  }

  // 캔버스가 옮기기 · 키우기 · 돌리기를 끝냈을 때
  // 틀이 놓은 것을 손으로 옮기면 틀 표시를 뗀다 — 그 뒤로 틀이 다시 건드리지 않는다. 다른 아이템은 그 자리 그대로 (다음에 올리거나 지울 때 당겨진다)
  function change(changed: CanvasObject) {
    const { objects: current, template: currentTemplate } = latest.current;
    // 틀 아이템을 옮기면 그 이름 · 번호 글자(B)도 같은 만큼 따라 옮긴다 — 글자만 옛 칸에 남지 않게
    const before = current.find((object) => object.id === changed.id);
    const dx = before ? changed.x - before.x : 0;
    const dy = before ? changed.y - before.y : 0;
    const followers = before?.template?.role === "item" ? [`label:${changed.id}`, `number:${changed.id}`] : [];
    const moved = current.map((object) => {
      if (object.id === changed.id) return changed;
      if (object.template?.role === "text" && followers.includes(object.template.key)) return { ...object, x: object.x + dx, y: object.y + dy };
      return object;
    });
    const { objects: next, template: nextTemplate } = detach(moved, changed.id, currentTemplate);
    apply(next, { template: nextTemplate });
  }

  // 개체 하나의 틀 표시를 뗀다. 아이템이면 그 이름 · 번호 글자도 같이 (따로 놀지 않게, 지금 자리 그대로)
  function detach(list: CanvasObject[], id: string, currentTemplate: CanvasTemplate | null): { objects: CanvasObject[]; template: CanvasTemplate | null } {
    const target = list.find((object) => object.id === id);
    if (!currentTemplate || !target?.template) return { objects: list, template: currentTemplate };
    const keys = target.template.role === "item" ? [`label:${id}`, `number:${id}`] : [];
    let nextTemplate: CanvasTemplate | null | undefined = currentTemplate;
    const next = list.map((object) => {
      if (object.id !== id && !(object.template?.role === "text" && keys.includes(object.template.key))) return object;
      const detached = detachObject(object, nextTemplate);
      nextTemplate = detached.template;
      return detached.object;
    });
    return { objects: next, template: nextTemplate ?? null };
  }

  // 글자를 그려 본 뒤 잰 크기 — 되돌리기 기록 없이 조용히 적는다
  const measure = useCallback((id: string, width: number, height: number) => {
    // 틀이 쓴 글자는 잰 폭으로 맞춤 자리(가운데 · 왼쪽 끝 · 오른쪽 끝)를 다시 맞춘다
    setSnapshot((current) => ({
      ...current,
      objects: current.objects.map((object) => {
        if (object.id !== id) return object;
        if (object.template?.role === "text") return { ...object, width, height, ...placeText(object.template, width, height) };
        return { ...object, width, height };
      }),
    }));
  }, [setSnapshot]);

  // 글자 올리기 · 고치기 (＋ 판의 텍스트 칩). 자리를 잡으려고 글꼴을 불러 대강의 크기를 잰다 — 정확한 크기는 캔버스가 그린 뒤 다시 잰다
  async function putText(style: TextStyle) {
    setSheet(null);
    if (editingTextId) {
      const id = editingTextId;
      setEditingTextId(null);
      // 틀이 쓴 글자를 고치면 틀이 더는 다시 쓰지 않는다
      const { objects: next, template: nextTemplate } = detach(objects.map((object) => (object.id === id && object.kind === "text" ? { ...object, ...style } : object)), id, template);
      apply(next, { template: nextTemplate });
      return;
    }
    if (objects.length >= MAX_OBJECTS) return setNotice(`캔버스에는 ${MAX_OBJECTS}개까지 올릴 수 있어요.`);
    await loadTextFont(style.font, style.text, style.bold);
    const context = document.createElement("canvas").getContext("2d");
    const lines = style.text.split("\n");
    let width = style.fontSize * Math.max(...lines.map((line) => line.length)) * 0.6;
    if (context) {
      context.font = `${style.bold ? "bold" : "normal"} ${style.fontSize}px ${textFont(style.font).family}`;
      width = Math.max(...lines.map((line) => context.measureText(line).width));
    }
    const padding = style.background ? style.fontSize * 0.5 : 0;
    const object = placeNewText(style, width + padding, style.fontSize * 1.3 * lines.length + padding, objects.length);
    apply([...objects, object]);
    setSelectedId(object.id);
    setMenuOpen(false);
  }

  const selected = objects.find((object) => object.id === selectedId) ?? null;
  const textDraft: TextStyle = selected?.kind === "text" && editingTextId === selected.id ? selected : DEFAULT_TEXT_STYLE;

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

  // 틀이 놓은 아이템을 지우면 뒤 아이템이 당겨진다 (구멍을 남기지 않는다). 틀이 쓴 글자를 지우면 다시 쓰지 않는다
  function remove() {
    const id = selectedId;
    if (!id) return;
    setSelectedId(null);
    setMenuOpen(false);
    return serial(async () => {
      const { objects: current, template: currentTemplate } = latest.current;
      const target = current.find((object) => object.id === id);
      const rest = current.filter((object) => object.id !== id);
      if (currentTemplate && target?.template?.role === "text") {
        const key = target.template.key;
        return apply(rest, { template: { ...currentTemplate, detached: [...currentTemplate.detached, key] } });
      }
      if (currentTemplate && target?.template?.role === "item") return apply(arrangeNow(rest, currentTemplate));
      apply(rest);
    });
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

  // 틀의 빈 자리 (점선 회색 판). 이미지에는 안 찍힌다
  const slots = emptySlots(template, objects);

  const placedItemIds = new Set(objects.flatMap((object) => (object.kind !== "text" && object.itemId ? [object.itemId] : [])));

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
      if (object.kind === "text" || !object.itemId) continue;
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

  const labels: PostLabel[] = itemAreas().map((area) => ({ ...area, name: itemNameOf.get(area.itemId) ?? "" }));

  // 포스팅 (M-11). 완성 이미지와 갤러리 사진을 저장소에 올린 뒤 서버에 한 줄 적는다. 끝나면 서버가 내 프로필로 보낸다
  async function submitPost(title: string, description: string) {
    if (!captured || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      const postId = crypto.randomUUID();
      const document: CanvasDocument = { version: 1, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background, objects, template };
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
      {/* ＋ — 스티커 · 사진 · 텍스트 · 배경이 든 판 */}
      {/* 빈 캔버스면 틀 칩부터 */}
      <ToolButton tool="add" onClick={() => setSheet(objects.length === 0 ? "templates" : "stickers")} />
      <ToolButton tool="clear" onClick={clearAll} disabled={objects.length === 0} />
      <ToolButton tool="done" onClick={makeImage} />
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
              <Canvas background={background} objects={objects} width={size.width} height={size.height} selectedId={selectedId} onPress={press} onTap={tap} onChange={change} onMeasure={measure} onOverlay={setOverlay} captureRef={captureRef} emptySlots={slots} />

              {objects.length === 0 && !template && (
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
                    className="absolute z-10 flex size-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-ink bg-white text-ink active:opacity-60"
                    style={{ left: Math.min(overlay.x + overlay.width, size.width - 12), top: Math.max(overlay.y, 12) }}
                  >
                    <Icon name="close24" scale={0.625} />
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      className="absolute z-10 flex flex-col gap-2 rounded-sm bg-dropdown p-2 text-label font-semibold text-gray-1"
                      style={{ left: Math.min(overlay.x + overlay.width + 8, size.width - 130), top: Math.min(overlay.y + overlay.height / 2, size.height - 70) }}
                    >
                      {selected?.kind === "text" && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setEditingTextId(selected.id);
                            setMenuOpen(false);
                            setSheet("text");
                          }}
                          className="whitespace-nowrap text-left active:opacity-60"
                        >
                          글자 고치기
                        </button>
                      )}
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
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (!file) return;
          // 고르면 ＋ 판의 사진 칩에서 다듬는다 (배경 지우기 · 모양)
          setPhotoFile(file);
          setSheet("photo");
        }}
      />
      {sheet && (
        <AddSheet
          tab={sheet}
          onTab={setSheet}
          template={template?.id ?? null}
          onTemplate={chooseTemplate}
          background={background}
          onBackground={applyBackground}
          onSticker={addSticker}
          photoFile={photoFile}
          onPickPhoto={() => photoInput.current?.click()}
          onPhoto={addPhoto}
          textDraft={textDraft}
          editingText={editingTextId !== null}
          onText={putText}
          onClose={() => {
            setSheet(null);
            setEditingTextId(null);
            setPhotoFile(null);
          }}
        />
      )}
      <Toast message={notice} onDone={hideNotice} />
    </main>
  );
}

// 아이콘 위 · 이름 아래 세로 묶음 (24 + 2 + 13 = 39, 헤더 64 안). 이름은 11px 회색, aria-label 도 같은 말.
// 비활성이면 아이콘 · 이름이 함께 흐려진다
function ToolButton({ tool, onClick, disabled = false }: { tool: keyof typeof TOOLS; onClick: () => void; disabled?: boolean }) {
  const { icon, label } = TOOLS[tool];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex flex-col items-center gap-0.5 active:opacity-60 disabled:opacity-30"
    >
      <Icon name={icon} />
      <span aria-hidden className="whitespace-nowrap text-[11px] leading-[1.2] font-medium tracking-[-0.01em] text-ink-muted">
        {label}
      </span>
    </button>
  );
}

// 비율은 0~1 사이로 — 캔버스 밖으로 조금 나간 것도 안으로
function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}
