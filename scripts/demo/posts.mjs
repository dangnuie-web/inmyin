// 데모 INMYIN 게시물 — 캔버스 문서(lib/inmyin/canvas.ts 형식) 배치 계산.
// 무늬 템플릿 설계서(오피스 inmyin/디자인/템플릿/20261020_inmyin_에디터템플릿설계_v01.md) 3절의 A 가방 열기 · B 목록 좌표를 그대로 옮겼다.
// DOM · 네트워크를 쓰지 않는다 (시험: demo-data.test.mjs). 그림은 render-posts.mjs 가 헤드리스 크롬 캔버스로 그린다.
//
// 아이템 그림은 배경을 지운 PNG 라 둘레에 투명한 여백이 있다. 틀의 "상자"에는 보이는 물건(투명 아닌 부분)이 꽉 차게 맞추고,
// 캔버스 개체는 앱처럼 그림 전체(여백 포함)의 자리로 적는다 — 앱 에디터에 누끼 아이템을 올린 것과 같은 모양.

import sharp from "sharp";
import { stableUuid } from "./lib.mjs";

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;
export const POST_TITLE_MAX = 40;
export const POST_DESCRIPTION_MAX = 500;
export const MAX_OBJECTS = 40;
export const TEMPLATES = ["A", "B"];
// 앱 글꼴 id (lib/inmyin/fonts.ts) — "pretendard" 가 기본(지금은 Wanted Sans)
export const DEFAULT_FONT = "pretendard";
const MUTED = "#8a8a8a";
const INK = "#000000";

export const postId = (handle, key) => stableUuid(`post:${handle}:${key}`);

// 개체 id — 다시 만들어도 같게
const objectId = (post, n) => stableUuid(`post-object:${post}:${n}`);

// 그림 하나를 상자에 맞춘다.
// item = { width, height, bbox: { x, y, width, height } } (그림 픽셀, bbox 는 보이는 부분)
// box = { x, y, width, height }, align = "bottom" | "center", rotation = 도 (보이는 물건의 가운데를 축으로)
// 돌려주는 것은 캔버스 개체의 자리 { x, y, width, height, rotation } — Konva 처럼 왼쪽 위 모서리를 축으로 돌린 값
export function fitItem(item, box, { align = "center", rotation = 0 } = {}) {
  const bbox = item.bbox ?? { x: 0, y: 0, width: item.width, height: item.height };
  const s = Math.min(box.width / bbox.width, box.height / bbox.height);
  const visibleW = bbox.width * s;
  const visibleH = bbox.height * s;
  const vx = box.x + (box.width - visibleW) / 2;
  const vy = align === "bottom" ? box.y + box.height - visibleH : box.y + (box.height - visibleH) / 2;
  // 돌리기 전 개체 왼쪽 위
  const x0 = vx - bbox.x * s;
  const y0 = vy - bbox.y * s;
  const width = item.width * s;
  const height = item.height * s;
  if (!rotation) return { x: x0, y: y0, width, height, rotation: 0 };
  // 보이는 물건의 가운데가 제자리에 남도록, 왼쪽 위 축을 옮긴다
  const local = { x: vx + visibleW / 2 - x0, y: vy + visibleH / 2 - y0 };
  const center = { x: x0 + local.x, y: y0 + local.y };
  const r = (rotation * Math.PI) / 180;
  const rotated = { x: local.x * Math.cos(r) - local.y * Math.sin(r), y: local.x * Math.sin(r) + local.y * Math.cos(r) };
  return { x: center.x - rotated.x, y: center.y - rotated.y, width, height, rotation };
}

// 상자를 캔버스 가장자리 margin 안으로 밀어 넣는다
function inside(box, margin) {
  return {
    ...box,
    x: Math.min(Math.max(box.x, margin), CANVAS_WIDTH - margin - box.width),
    y: Math.min(Math.max(box.y, margin), CANVAS_HEIGHT - margin - box.height),
  };
}

const square = (cx, cy, s) => ({ x: cx - s / 2, y: cy - s / 2, width: s, height: s });

// 글자 개체. 크기(width · height)는 그려 봐야 알아서, 그리는 쪽(render-posts.mjs)이 재서 채우고 anchor 를 지운다.
// anchor = 글자 상자의 어디를 (ax, ay) 에 맞출지 — "center" | "left" | "right" (세로는 늘 가운데)
function text(id, content, { fontSize, fill = INK, bold = false, ax, ay, anchor = "center", font = DEFAULT_FONT }) {
  return { id, kind: "text", text: content, font, fontSize, fill, bold, stroke: null, background: null, x: ax, y: ay, width: 0, height: 0, rotation: 0, anchor };
}

function imageObject(id, code, place) {
  // src 는 넣을 때(seed) 그 아이템의 썸네일 공개 주소로 바꾼다
  return { id, kind: "item", itemId: null, code, src: `item:${code}`, ...place };
}

// ── A 가방 열기 ─────────────────────────────────────────────
// 첫 아이템(가방)이 아래 크게 · 맨 앞, 나머지(최대 9)가 그 위로 부채꼴로 솟음 (가방 뒤에 깔림)
export function layoutA(items, { handle, title = "What's in my bag" }) {
  const [hero, ...rest] = items;
  const others = rest.slice(0, 9);
  const k = others.length;
  const slots = [];
  const fan = (list, { rx, ry, s, from, to }) =>
    list.forEach((_, i) => {
      const a = (list.length === 1 ? 90 : from + ((to - from) * i) / (list.length - 1)) * (Math.PI / 180);
      slots.push({ cx: 540 + rx * Math.cos(a), cy: 880 - ry * Math.sin(a), s });
    });
  if (k <= 5) {
    const spread = Math.min(140, 34 * (k - 1));
    fan(others, { rx: 400, ry: Math.min(480, 300 + 40 * k), s: k <= 2 ? 300 : 260, from: 90 + spread / 2, to: 90 - spread / 2 });
  } else {
    const inner = Math.floor(0.4 * k);
    fan(others.slice(0, inner), { rx: 250, ry: 320, s: 210, from: 140, to: 40 });
    fan(others.slice(inner), { rx: 420, ry: 540, s: 195, from: 168, to: 12 });
  }
  const objects = [];
  // 뒤에 깔리는 것부터
  others.forEach((item, i) => {
    const { cx, cy, s } = slots[i];
    const rotation = ((cx - 540) / 430) * 14;
    objects.push({ item, place: fitItem(item, inside(square(cx, cy, s), 24), { align: "center", rotation }) });
  });
  objects.push({ item: hero, place: fitItem(hero, { x: 230, y: 700, width: 620, height: 590 }, { align: "bottom" }) });
  return {
    background: { kind: "color", color: "#f2f2f2" },
    images: objects,
    texts: [
      { content: title, fontSize: 64, bold: true, ax: 540, ay: 118 },
      { content: `@${handle}`, fontSize: 34, fill: MUTED, ax: 540, ay: 186 },
    ],
  };
}

// ── B 목록 ─────────────────────────────────────────────────
// 칸에 줄 세우고 밑에 이름, 위에 번호. 물건 밑선을 맞춤. 최대 16
export function layoutB(items, { title }) {
  const list = items.slice(0, 16);
  const n = list.length;
  const cols = n <= 2 ? n : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const cw = 920 / cols;
  const ch = Math.min(1030 / rows, cw * 1.3);
  const top = 250 + (1030 - ch * rows) / 2;
  const cap = cols <= 2 ? 38 : cols === 3 ? 32 : 28;
  const images = [];
  const texts = [
    { content: title, fontSize: 76, bold: true, ax: 80, ay: 130, anchor: "left" },
    { content: `아이템 ${n}`, fontSize: 34, fill: MUTED, ax: 1000, ay: 140, anchor: "right" },
  ];
  list.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 80 + col * cw;
    const y = top + row * ch;
    const box = { x: x + 0.1 * cw, y: y + 0.1 * ch, width: 0.8 * cw, height: 0.9 * ch - 1.3 * cap - 34 };
    images.push({ item, place: fitItem(item, box, { align: "bottom" }) });
    texts.push({ content: item.name, fontSize: cap, ax: x + cw / 2, ay: y + ch - 0.65 * cap - 8 });
    texts.push({ content: String(i + 1).padStart(2, "0"), fontSize: Math.round(0.8 * cap), fill: MUTED, ax: x + 6, ay: y + 0.5 * cap, anchor: "left" });
  });
  return { background: { kind: "color", color: "#ffffff" }, images, texts };
}

// 게시물 하나의 캔버스 문서. items = [{ code, name, width, height, bbox }] (게시물에 적힌 순서)
export function buildPostDocument(post, items, { handle }) {
  const layout = post.template === "A" ? layoutA(items, { handle, title: post.canvasTitle || undefined }) : layoutB(items, { title: post.canvasTitle || post.title });
  const objects = [];
  let n = 0;
  for (const { item, place } of layout.images) objects.push(imageObject(objectId(post.id, n++), item.code, place));
  for (const t of layout.texts) objects.push(text(objectId(post.id, n++), t.content, t));
  return { version: 1, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: layout.background, objects };
}

// 그리는 쪽이 잰 글자 크기로 자리를 정한다 (Konva 의 Label 처럼 x · y 는 글자 상자 왼쪽 위)
export function placeMeasuredText(object, measuredWidth) {
  const height = object.fontSize * 1.3;
  const left = object.anchor === "left" ? object.x : object.anchor === "right" ? object.x - measuredWidth : object.x - measuredWidth / 2;
  const rest = { ...object };
  delete rest.anchor;
  return { ...rest, x: left, y: object.y - height / 2, width: measuredWidth, height };
}

// 게시물 ↔ 아이템 탭 영역 — 앱(Editor.tsx itemAreas)과 같이: 개체 자리(돌리기 전)를 캔버스 비율로, 같은 아이템이 둘이면 큰 쪽, 0~1 로 자름
export function itemAreas(document) {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const areas = new Map();
  for (const o of document.objects) {
    if (o.kind === "text" || !o.itemId) continue;
    const area = { itemId: o.itemId, x: o.x / CANVAS_WIDTH, y: o.y / CANVAS_HEIGHT, w: o.width / CANVAS_WIDTH, h: o.height / CANVAS_HEIGHT };
    const prev = areas.get(o.itemId);
    if (!prev || prev.w * prev.h < area.w * area.h) areas.set(o.itemId, area);
  }
  return [...areas.values()].map((a) => ({ itemId: a.itemId, x: clamp(a.x), y: clamp(a.y), w: clamp(a.w), h: clamp(a.h) }));
}

// 넣을 때: 그려 둔 문서의 "item:<번호>" 를 실제 아이템 id · 썸네일 주소로 바꾼다
export function bindDocument(document, { itemIdOf, srcOf }) {
  return {
    ...document,
    objects: document.objects.map((o) => {
      if (o.kind !== "item") return o;
      const { code, ...rest } = o;
      return { ...rest, itemId: itemIdOf(code), src: srcOf(code) };
    }),
  };
}

// 설정의 posts 검사. user = 정리된 유저(normalizeConfig 결과), codes = 그 유저의 아이템 번호들
export function normalizePosts(rawPosts, user, { fail, file, handles }) {
  const posts = [];
  const keys = new Set();
  for (const [i, p] of (Array.isArray(rawPosts) ? rawPosts : []).entries()) {
    const where = `users(${user.handle}).posts[${i}]`;
    const key = typeof p?.key === "string" && p.key.trim() ? p.key.trim() : String(i + 1);
    if (keys.has(key)) fail(where, `key ${key} 가 겹칩니다`);
    keys.add(key);
    const title = typeof p?.title === "string" ? p.title.trim() : "";
    if (!title) fail(where, "title 이 비어 있습니다");
    else if (title.length > POST_TITLE_MAX) fail(where, `title 은 ${POST_TITLE_MAX}자까지`);
    const description = typeof p?.description === "string" ? p.description.trim() : "";
    if (description.length > POST_DESCRIPTION_MAX) fail(where, `description 은 ${POST_DESCRIPTION_MAX}자까지`);
    const template = p?.template;
    if (!TEMPLATES.includes(template)) fail(where, `template 은 ${TEMPLATES.join(" · ")} 중 하나`);
    const items = Array.isArray(p?.items) ? p.items : [];
    if (items.length === 0) fail(where, "items 가 비어 있습니다");
    if (template === "A" && items.length > 10) fail(where, "A 틀은 아이템 10개까지 (가방 + 9)");
    if (template === "B" && items.length > 16) fail(where, "B 틀은 아이템 16개까지");
    const own = new Set(user.inventories.flatMap((inv) => inv.items.map((it) => it.code)));
    for (const code of items) if (!own.has(code)) fail(where, `items 의 ${code} 는 ${user.handle} 의 아이템이 아닙니다 (게시물에는 자기 아이템만)`);
    const hoursAgo = p?.hoursAgo ?? 0;
    if (typeof hoursAgo !== "number" || hoursAgo < 0) fail(where, "hoursAgo 는 0 이상의 숫자");
    const bookmarkedBy = [];
    for (const ref of Array.isArray(p?.bookmarkedBy) ? p.bookmarkedBy : []) {
      const target = handles.resolve(ref);
      if (!target) fail(where, `bookmarkedBy 의 ${JSON.stringify(ref)} 를 찾을 수 없습니다`);
      else if (target === user.handle) fail(where, "자기 게시물은 북마크하지 않습니다 (데모라 남이 누른 것처럼)");
      else if (!bookmarkedBy.includes(target)) bookmarkedBy.push(target);
    }
    posts.push({
      key,
      id: postId(user.handle, key),
      title,
      description: description || null,
      template,
      canvasTitle: typeof p?.canvasTitle === "string" ? p.canvasTitle.trim() : null,
      items: [...new Set(items)],
      hoursAgo,
      bookmarkedBy,
      // render-posts.mjs 가 그려 둔 완성 이미지(1080×1350 JPG)와 캔버스 문서(JSON)
      image: file(p?.image),
      canvas: file(p?.canvas),
    });
  }
  return posts;
}

// 누끼 PNG 의 보이는 부분(알파 > 8) 테두리. 누끼가 없으면 그림 전체
export async function visibleBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const bbox = x1 < 0 ? { x: 0, y: 0, width: info.width, height: info.height } : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  return { width: info.width, height: info.height, bbox };
}
