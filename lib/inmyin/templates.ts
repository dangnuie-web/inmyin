// INMYIN 에디터 틀(템플릿) — 고르면 배경 · 글자 · 아이템 자리가 한 번에 잡힌다 (오피스 로드맵 2단계 "에디터 템플릿").
// 모양은 무늬(디자인) 설계서 v01 3절(오피스 inmyin/디자인/템플릿/20261020_inmyin_에디터템플릿설계_v01.md) 좌표 그대로.
// 2026-10-20 당니님 결정: A 가방 열기 · B 목록 두 개, 고르면 올려 둔 아이템을 자리로, 넘치면 가운데 + 알림 한 번,
// 제목 = 인벤토리 이름 자동, A 문구 "What's in my bag" 영어, 크기 · 간격은 당니님이 직접 조정 → 숫자는 맨 위 TEMPLATE_NUMBERS 한 곳에.
//
// 이 파일은 화면(DOM) · 라이브러리를 쓰지 않는다 — node 로 바로 시험한다 (templates.test.mjs). 값을 가져오는 import 를 넣지 말 것 (타입만).
import type { CanvasBackground, CanvasObject, CanvasTemplate, ImageObject, TemplateMark, TextObject } from "./canvas";

// lib/inmyin/canvas.ts 의 캔버스 크기와 같다 (값을 가져오지 않으려고 따로 적음)
const W = 1080;
const H = 1350;

// ════════════════════════════════════════════════════════════════════════
// 당니님이 조정할 숫자 — 1080×1350 캔버스 기준 px, 회전은 도(°), 색은 #rrggbb.
// 글자의 x · y 는 글자 상자의 가운데(왼쪽 맞춤이면 왼쪽 끝, 오른쪽 맞춤이면 오른쪽 끝) 자리.
// 글자 문구의 {inventory} 는 인벤토리 이름, {handle} 은 @ 없는 아이디, {n} 은 자리에 든 아이템 수로 바뀐다.
// 고친 뒤 npm run test:template 로 시험(자리 수 · 캔버스 밖으로 나가지 않는지)이 통과하는지 확인.
// ════════════════════════════════════════════════════════════════════════
export const TEMPLATE_NUMBERS = {
  // 빈 자리 — 틀을 골랐는데 아이템이 아직 없을 때 보이는 점선 회색 판. 이미지로 만들 때는 안 찍힌다
  emptySlot: {
    fill: "#000000",
    fillOpacity: 0.05,
    stroke: "#bdbdbd",
    strokeWidth: 3,
    dash: [14, 10],
    radius: 28,
    // 자리 상자를 이만큼 줄여 그린다 — 겹치게 놓는 틀(가방 열기)에서도 자리 하나하나가 보이게
    shrink: 0.86,
  },

  // ── A 가방 열기 — 첫 아이템(가방)이 아래 크게 · 맨 앞, 나머지는 그 위로 부채꼴로 솟아 가방 뒤에 깔린다
  A: {
    name: "가방 열기",
    // 자리 수 (가방 + 9). 넘친 아이템은 가운데에 놓인다
    capacity: 10,
    // 빈 캔버스에서 고르면 보여 줄 빈 자리 수 (가방 + 5)
    preview: 6,
    background: "#f2f2f2",
    font: "pretendard",
    title: { text: "What's in my bag", size: 64, bold: true, color: "#000000", x: 540, y: 118 },
    // 둘째 줄 — 인벤토리 이름 (설계서의 "@아이디" 자리). 아이디를 같이 쓰려면 "{inventory} · @{handle}"
    subtitle: { text: "{inventory}", size: 34, bold: false, color: "#8a8a8a", x: 540, y: 186 },
    // 가방 자리 — 물건이 이 상자 바닥에 붙는다
    hero: { x: 230, y: 700, width: 620, height: 590 },
    // 부채의 중심
    fan: { x: 540, y: 880 },
    // 나머지가 oneRowMax 개 이하면 한 줄 부채
    oneRowMax: 5,
    oneRow: {
      rx: 400,
      // 세로 반지름 = min(ryMax, ryBase + ryPerItem × 개수)
      ryBase: 300,
      ryPerItem: 40,
      ryMax: 480,
      // 물건 상자 한 변 — 2개 이하면 size2, 그 위는 size
      size2: 300,
      size: 260,
      // 부채 폭(도) = min(spreadMax, spreadPerItem × (개수 − 1)), 90°(위)를 가운데로
      spreadPerItem: 34,
      spreadMax: 140,
    },
    // 그 위(6~9개)는 두 줄 — 안쪽에 개수 × innerShare(내림)개, 바깥에 나머지. from → to 는 왼쪽 → 오른쪽 각도
    twoRows: {
      innerShare: 0.4,
      inner: { rx: 250, ry: 320, size: 210, from: 140, to: 40 },
      outer: { rx: 420, ry: 540, size: 195, from: 168, to: 12 },
    },
    // 기울기 = (자리 x − 540) / tiltPer × tiltMax — 가운데서 멀수록 바깥으로 기욺
    tiltMax: 14,
    tiltPer: 430,
    // 부채 자리는 캔버스 가장자리에서 이만큼 안으로
    margin: 24,
  },

  // ── B 목록 — 칸에 줄 세우고 위에 번호, 밑에 이름. 물건 밑선을 맞춤
  B: {
    name: "목록",
    capacity: 16,
    preview: 6,
    background: "#ffffff",
    font: "pretendard",
    // 제목 — 왼쪽 끝을 x 에
    title: { text: "{inventory}", size: 76, bold: true, color: "#000000", x: 80, y: 130 },
    // 개수 — 오른쪽 끝을 x 에
    count: { text: "아이템 {n}", size: 34, bold: false, color: "#8a8a8a", x: 1000, y: 140 },
    // 칸을 놓는 영역. 칸 묶음은 이 안에서 세로 가운데, 마지막 줄은 왼쪽부터
    area: { x: 80, y: 250, width: 920, height: 1030 },
    // 열 수 — [아이템 수가 이 이하면, 이 열]. 차례로 본다
    columns: [
      [1, 1],
      [2, 2],
      [4, 2],
      [9, 3],
      [16, 4],
    ],
    // 칸 높이는 칸 폭 × 이 값을 넘지 않는다
    cellHeightMax: 1.3,
    // 이름 글자 크기 — 열 수별 (1 · 2 · 3 · 4열)
    nameSize: [38, 38, 32, 28],
    nameColor: "#000000",
    // 이름 가운데 = 칸 아래에서 (0.65 × 이름 크기 + nameBottom) 위
    nameBottom: 8,
    // 물건 상자 — 칸 안쪽 여백(칸 폭 · 높이의 비율), 상자 높이 = 0.9 × 칸 높이 − 1.3 × 이름 크기 − nameGap
    boxInset: 0.1,
    boxWidth: 0.8,
    boxHeight: 0.9,
    nameGap: 34,
    // 번호 "01" — 이름 크기 × numberScale, 왼쪽 끝 = 칸 x + numberX, 가운데 높이 = 칸 y + 0.5 × 이름 크기
    numberScale: 0.8,
    numberColor: "#8a8a8a",
    numberX: 6,
  },
};
// ════════════════════════════════════════════════════════════════════════

export type TemplateId = CanvasTemplate["id"];
export const TEMPLATE_IDS: TemplateId[] = ["A", "B"];

export function templateName(id: TemplateId) {
  return TEMPLATE_NUMBERS[id].name;
}

export function templateCapacity(id: TemplateId) {
  return TEMPLATE_NUMBERS[id].capacity;
}

export function templateBackground(id: TemplateId): CanvasBackground {
  return { kind: "color", color: TEMPLATE_NUMBERS[id].background };
}

// 자리 하나 — 물건이 들어갈 상자(돌리기 전). 물건은 이 상자 안에 원래 비율대로 맞춰 넣고, 상자 가운데를 축으로 rotation 만큼 돌린다
export type TemplateSlot = { x: number; y: number; width: number; height: number; rotation: number; align: "center" | "bottom" };

export type TextAnchor = "center" | "left" | "right";

// 틀이 쓸 글자 하나
export type TemplateTextSpec = { key: string; text: string; font: string; fontSize: number; bold: boolean; fill: string; ax: number; ay: number; anchor: TextAnchor };

export type TemplateLayout = {
  slots: TemplateSlot[];
  // 맨 앞에 그릴 자리 (A 의 가방). 없으면 null
  front: number | null;
  texts: TemplateTextSpec[];
};

// 자리에 든 아이템 — 글자(B 의 이름 · 번호)를 달려고. objectId 는 글자의 key 에 쓴다
export type SlotItem = { objectId: string; name: string };

export type TemplateContext = { inventory: string; handle: string };

function fill(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

const square = (cx: number, cy: number, s: number) => ({ x: cx - s / 2, y: cy - s / 2, width: s, height: s });

function inside<T extends { x: number; y: number; width: number; height: number }>(box: T, margin: number): T {
  return { ...box, x: Math.min(Math.max(box.x, margin), W - margin - box.width), y: Math.min(Math.max(box.y, margin), H - margin - box.height) };
}

// 틀의 자리 · 글자. count = 자리 수(0 ~ 자리 수 한도). items = 앞에서부터 자리에 든 아이템 (빈 자리는 없음 → 이름 · 번호도 없음)
export function templateLayout(id: TemplateId, count: number, context: TemplateContext, items: SlotItem[] = []): TemplateLayout {
  const n = Math.max(0, Math.min(Math.floor(count), templateCapacity(id)));
  return id === "A" ? layoutA(n, context) : layoutB(n, context, items);
}

function layoutA(n: number, context: TemplateContext): TemplateLayout {
  const A = TEMPLATE_NUMBERS.A;
  const slots: TemplateSlot[] = [];
  if (n > 0) slots.push({ ...A.hero, rotation: 0, align: "bottom" });
  const k = Math.max(0, n - 1);
  const ring = (count: number, { rx, ry, size, from, to }: { rx: number; ry: number; size: number; from: number; to: number }) => {
    for (let i = 0; i < count; i++) {
      const angle = ((count === 1 ? (from + to) / 2 : from + ((to - from) * i) / (count - 1)) * Math.PI) / 180;
      const cx = A.fan.x + rx * Math.cos(angle);
      const cy = A.fan.y - ry * Math.sin(angle);
      const rotation = ((cx - A.fan.x) / A.tiltPer) * A.tiltMax;
      slots.push({ ...inside(square(cx, cy, size), A.margin), rotation, align: "center" });
    }
  };
  if (k > 0 && k <= A.oneRowMax) {
    const one = A.oneRow;
    const spread = Math.min(one.spreadMax, one.spreadPerItem * (k - 1));
    ring(k, { rx: one.rx, ry: Math.min(one.ryMax, one.ryBase + one.ryPerItem * k), size: k <= 2 ? one.size2 : one.size, from: 90 + spread / 2, to: 90 - spread / 2 });
  } else if (k > A.oneRowMax) {
    const inner = Math.floor(A.twoRows.innerShare * k);
    ring(inner, A.twoRows.inner);
    ring(k - inner, A.twoRows.outer);
  }
  const values = { inventory: context.inventory, handle: context.handle, n };
  const texts: TemplateTextSpec[] = [
    { key: "title", text: fill(A.title.text, values), font: A.font, fontSize: A.title.size, bold: A.title.bold, fill: A.title.color, ax: A.title.x, ay: A.title.y, anchor: "center" },
    { key: "subtitle", text: fill(A.subtitle.text, values), font: A.font, fontSize: A.subtitle.size, bold: A.subtitle.bold, fill: A.subtitle.color, ax: A.subtitle.x, ay: A.subtitle.y, anchor: "center" },
  ];
  return { slots, front: n > 0 ? 0 : null, texts: texts.filter((text) => text.text.trim()) };
}

export function listColumns(n: number) {
  for (const [upTo, columns] of TEMPLATE_NUMBERS.B.columns) if (n <= upTo) return columns;
  return TEMPLATE_NUMBERS.B.columns[TEMPLATE_NUMBERS.B.columns.length - 1][1];
}

function layoutB(n: number, context: TemplateContext, items: SlotItem[]): TemplateLayout {
  const B = TEMPLATE_NUMBERS.B;
  const values = { inventory: context.inventory, handle: context.handle, n: Math.min(n, items.length) };
  const texts: TemplateTextSpec[] = [
    { key: "title", text: fill(B.title.text, values), font: B.font, fontSize: B.title.size, bold: B.title.bold, fill: B.title.color, ax: B.title.x, ay: B.title.y, anchor: "left" },
  ];
  // 아이템이 없으면 "아이템 0" 은 쓰지 않는다
  if (items.length > 0) texts.push({ key: "count", text: fill(B.count.text, values), font: B.font, fontSize: B.count.size, bold: B.count.bold, fill: B.count.color, ax: B.count.x, ay: B.count.y, anchor: "right" });
  const slots: TemplateSlot[] = [];
  if (n > 0) {
    const columns = listColumns(n);
    const rows = Math.ceil(n / columns);
    const cw = B.area.width / columns;
    const ch = Math.min(B.area.height / rows, cw * B.cellHeightMax);
    const top = B.area.y + (B.area.height - ch * rows) / 2;
    const cap = B.nameSize[Math.min(columns, B.nameSize.length) - 1];
    for (let i = 0; i < n; i++) {
      const x = B.area.x + (i % columns) * cw;
      const y = top + Math.floor(i / columns) * ch;
      slots.push({ x: x + B.boxInset * cw, y: y + B.boxInset * ch, width: B.boxWidth * cw, height: B.boxHeight * ch - 1.3 * cap - B.nameGap, rotation: 0, align: "bottom" });
      const item = items[i];
      if (!item) continue;
      if (item.name.trim()) texts.push({ key: `label:${item.objectId}`, text: item.name, font: B.font, fontSize: cap, bold: false, fill: B.nameColor, ax: x + cw / 2, ay: y + ch - 0.65 * cap - B.nameBottom, anchor: "center" });
      texts.push({ key: `number:${item.objectId}`, text: String(i + 1).padStart(2, "0"), font: B.font, fontSize: Math.round(B.numberScale * cap), bold: false, fill: B.numberColor, ax: x + B.numberX, ay: y + 0.5 * cap, anchor: "left" });
    }
  }
  return { slots, front: null, texts: texts.filter((text) => text.text.trim()) };
}

// 그림의 크기와 보이는 부분(누끼의 투명 아닌 테두리). bbox 가 없으면 그림 전체
export type ImageExtent = { width: number; height: number; bbox?: { x: number; y: number; width: number; height: number } };

// 그림을 자리에 맞춘다 — 보이는 물건이 상자에 꽉 차게(비율 그대로), 아래 정렬이면 바닥에 붙인다.
// 돌려주는 것은 캔버스 개체 자리 (Konva 처럼 왼쪽 위 모서리를 축으로 돌린 값). 돌려도 보이는 물건의 가운데는 제자리
export function fitInSlot(image: ImageExtent, slot: TemplateSlot) {
  const bbox = image.bbox && image.bbox.width > 0 && image.bbox.height > 0 ? image.bbox : { x: 0, y: 0, width: image.width, height: image.height };
  const s = Math.min(slot.width / bbox.width, slot.height / bbox.height);
  const visibleW = bbox.width * s;
  const visibleH = bbox.height * s;
  const vx = slot.x + (slot.width - visibleW) / 2;
  const vy = slot.align === "bottom" ? slot.y + slot.height - visibleH : slot.y + (slot.height - visibleH) / 2;
  const x0 = vx - bbox.x * s;
  const y0 = vy - bbox.y * s;
  const width = image.width * s;
  const height = image.height * s;
  if (!slot.rotation) return { x: x0, y: y0, width, height, rotation: 0 };
  const local = { x: vx + visibleW / 2 - x0, y: vy + visibleH / 2 - y0 };
  const r = (slot.rotation * Math.PI) / 180;
  const turned = { x: local.x * Math.cos(r) - local.y * Math.sin(r), y: local.x * Math.sin(r) + local.y * Math.cos(r) };
  return { x: x0 + local.x - turned.x, y: y0 + local.y - turned.y, width, height, rotation: slot.rotation };
}

// 글자 상자의 자리 — 잰 폭 · 높이로 anchor 를 (ax, ay) 에 맞춘다 (세로는 늘 가운데)
export function placeText(mark: { ax: number; ay: number; anchor: TextAnchor }, width: number, height: number) {
  const x = mark.anchor === "left" ? mark.ax : mark.anchor === "right" ? mark.ax - width : mark.ax - width / 2;
  return { x, y: mark.ay - height / 2 };
}

// 넘친 아이템 — 지금 에디터가 새로 올릴 때처럼 가운데, 긴 변 432(폭의 0.4), 40px 씩 비껴 쌓기
function overflowPlace(image: ImageExtent, index: number) {
  const scale = (W * 0.4) / Math.max(image.width, image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const offset = (index % 5) * 40;
  return { x: (W - width) / 2 + offset, y: (H - height) / 2 + offset, width, height, rotation: 0 };
}

export type ArrangeContext = TemplateContext & {
  // 아이템 이름 (B 의 이름 글자)
  nameOf: (itemId: string) => string;
  // 그림의 원래 크기 · 보이는 부분. 모르면 undefined — 지금 개체의 비율로 대신한다
  extentOf: (object: ImageObject) => ImageExtent | undefined;
  // 글자 폭 재기 (캔버스 기준 px). 높이는 fontSize × 1.3 (한 줄, 바탕 없음 — Canvas.tsx 와 같다)
  measure: (spec: TemplateTextSpec) => number;
  newId: () => string;
};

export type ArrangeResult = {
  objects: CanvasObject[];
  // 자리 수를 넘쳐 가운데에 놓인 아이템 수
  overflow: number;
};

const isItem = (object: CanvasObject): object is ImageObject => object.kind === "item";
const isTemplateText = (object: CanvasObject) => object.kind === "text" && object.template?.role === "text";
const slotOf = (object: CanvasObject) => (object.template?.role === "item" ? object.template.slot : Number.POSITIVE_INFINITY);

// 틀이 자리에 넣을 아이템, 자리 순서대로 (arrange 와 같은 순서 — 첫 것이 A 의 가방, 제목의 인벤토리)
export function managedItems(objects: CanvasObject[], gatherAll = false): ImageObject[] {
  return objects
    .map((object, index) => ({ object, index }))
    .filter(({ object }) => isItem(object) && (gatherAll || object.template?.role === "item"))
    .sort((a, b) => slotOf(a.object) - slotOf(b.object) || a.index - b.index)
    .map(({ object }) => object as ImageObject);
}

// 틀대로 다시 놓는다 — 틀을 고를 때, 틀이 있는 채로 아이템을 올리거나 지울 때.
// gatherAll — 처음 틀을 고를 때: 캔버스의 아이템을 모두 자리로 (2026-10-20 당니님 결정). 아니면 틀 표시가 있는 것만 — 손으로 옮긴 것은 그대로.
// 자리 순서: 이미 자리에 있던 것(자리 순) → 나머지(캔버스 순 = 올린 순). 자리에 든 아이템 수에 맞춰 칸 · 부채가 다시 잡힌다 (구멍을 남기지 않는다).
// 틀이 쓴 글자는 새로 쓴다 — 사용자가 옮기거나 고치거나 지운 글자(detached)는 다시 쓰지 않는다.
// 그리는 순서: 틀 묶음(뒤에 깔리는 자리 → 맨 앞 자리 → 글자)이 원래 틀 것이 있던 자리에 들어가고, 다른 것(사진 · 스티커 · 내 글자)의 앞뒤는 그대로
export function arrange(template: CanvasTemplate, objects: CanvasObject[], context: ArrangeContext, { gatherAll = false }: { gatherAll?: boolean } = {}): ArrangeResult {
  const managed = managedItems(objects, gatherAll);
  const managedIds = new Set(managed.map((object) => object.id));
  const capacity = templateCapacity(template.id);
  const placed = managed.slice(0, capacity);
  const extra = managed.slice(capacity);

  const layout = templateLayout(
    template.id,
    placed.length,
    context,
    placed.map((object) => ({ objectId: object.id, name: object.itemId ? context.nameOf(object.itemId) : "" })),
  );

  const extentOf = (object: ImageObject): ImageExtent => context.extentOf(object) ?? { width: object.width, height: object.height };
  const placedObjects = placed.map((object, slot): ImageObject => ({ ...object, ...fitInSlot(extentOf(object), layout.slots[slot]), template: { role: "item", slot } }));
  const extraObjects = extra.map((object, i): ImageObject => ({ ...object, ...overflowPlace(extentOf(object), i), template: { role: "item", slot: capacity + i } }));

  const previousTexts = new Map(objects.filter(isTemplateText).map((object) => [(object.template as { key: string }).key, object as TextObject]));
  const texts = layout.texts
    .filter((spec) => !template.detached.includes(spec.key))
    .map((spec): TextObject => {
      const width = context.measure(spec);
      const height = spec.fontSize * 1.3;
      const mark: TemplateMark = { role: "text", key: spec.key, ax: spec.ax, ay: spec.ay, anchor: spec.anchor };
      return {
        id: previousTexts.get(spec.key)?.id ?? context.newId(),
        kind: "text",
        text: spec.text,
        font: spec.font,
        fontSize: spec.fontSize,
        fill: spec.fill,
        bold: spec.bold,
        stroke: null,
        background: null,
        ...placeText(mark, width, height),
        width,
        height,
        rotation: 0,
        template: mark,
      };
    });

  const front = layout.front;
  const block: CanvasObject[] = [...placedObjects.filter((_, slot) => slot !== front), ...(front !== null && placedObjects[front] ? [placedObjects[front]] : []), ...texts];

  // 틀 것이 처음 나오던 자리에 틀 묶음을 넣는다 (없으면 맨 위)
  const belongs = (object: CanvasObject) => managedIds.has(object.id) || isTemplateText(object);
  const firstIndex = objects.findIndex(belongs);
  const others = objects.filter((object) => !belongs(object));
  const insertAt = firstIndex < 0 ? others.length : objects.slice(0, firstIndex).filter((object) => !belongs(object)).length;
  const result = [...others.slice(0, insertAt), ...block, ...others.slice(insertAt), ...extraObjects];
  return { objects: result, overflow: extra.length };
}

// 지금 보여 줄 빈 자리 — 틀에 든 아이템이 하나도 없으면 미리 보기 개수(preview)만큼. 하나라도 있으면 칸이 개수에 맞춰 잡혀 빈 자리가 없다
export function emptySlots(template: CanvasTemplate | null | undefined, objects: CanvasObject[]): TemplateSlot[] {
  if (!template) return [];
  if (objects.some((object) => isItem(object) && object.template?.role === "item")) return [];
  return templateLayout(template.id, TEMPLATE_NUMBERS[template.id].preview, { inventory: "", handle: "" }).slots;
}

// 빈 자리 판을 그릴 상자 — 자리 상자를 shrink 만큼 줄임 (가운데 그대로)
export function shrinkSlot(slot: TemplateSlot, shrink = TEMPLATE_NUMBERS.emptySlot.shrink): TemplateSlot {
  const width = slot.width * shrink;
  const height = slot.height * shrink;
  return { ...slot, x: slot.x + (slot.width - width) / 2, y: slot.y + (slot.height - height) / 2, width, height };
}

// 사용자가 옮기거나 고친 것 — 틀 표시를 뗀다. 글자면 그 key 를 detached 에 더한 틀을 돌려준다
export function detachObject<T extends CanvasObject>(object: T, template: CanvasTemplate | null | undefined): { object: T; template: CanvasTemplate | null | undefined } {
  if (!object.template) return { object, template };
  const rest = { ...object };
  delete rest.template;
  if (object.template.role === "text" && template && !template.detached.includes(object.template.key)) {
    return { object: rest, template: { ...template, detached: [...template.detached, object.template.key] } };
  }
  return { object: rest, template };
}
