// 데모 INMYIN 게시물 배치 시험 (posts.mjs). DB · 브라우저 없이.
import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { bindDocument, buildPostDocument, fitItem, itemAreas, layoutA, layoutB, normalizePosts, placeMeasuredText, postId, visibleBox } from "./posts.mjs";

// 640×640 그림 가운데 320×160 만 보이는 누끼
const item = (code, name = code) => ({ code, name, width: 640, height: 640, bbox: { x: 160, y: 240, width: 320, height: 160 } });
const visible = (o, it) => {
  const s = o.width / it.width;
  return { x: o.x + it.bbox.x * s, y: o.y + it.bbox.y * s, width: it.bbox.width * s, height: it.bbox.height * s };
};
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("상자 맞추기 — 보이는 물건이 상자에 꽉, 아래 정렬이면 바닥에 붙음, 그림은 비율 그대로", () => {
  const it = item("1-01");
  const box = { x: 100, y: 100, width: 400, height: 400 };
  const o = fitItem(it, box, { align: "bottom" });
  const v = visible(o, it);
  close(v.width, 400);
  close(v.x, 100);
  close(v.y + v.height, 500, 1e-6);
  close(o.width / o.height, 1);
  const c = visible(fitItem(it, box), it);
  close(c.y + c.height / 2, 300);
});

test("돌려도 보이는 물건의 가운데는 제자리 (Konva 처럼 왼쪽 위 축으로 돌린 값)", () => {
  const it = item("1-01");
  const box = { x: 100, y: 100, width: 400, height: 400 };
  const flat = visible(fitItem(it, box), it);
  const o = fitItem(it, box, { rotation: 30 });
  const s = o.width / it.width;
  // 물건 가운데의 그림 속 좌표 → 왼쪽 위 축으로 30° 돌린 화면 좌표
  const lx = (it.bbox.x + it.bbox.width / 2) * s;
  const ly = (it.bbox.y + it.bbox.height / 2) * s;
  const r = (30 * Math.PI) / 180;
  close(o.x + lx * Math.cos(r) - ly * Math.sin(r), flat.x + flat.width / 2);
  close(o.y + lx * Math.sin(r) + ly * Math.cos(r), flat.y + flat.height / 2);
  assert.equal(o.rotation, 30);
});

test("A 가방 열기 — 가방이 맨 앞(마지막), 나머지는 위쪽 부채, 가운데서 멀수록 바깥으로 기욺, 제목 · 아이디", () => {
  const items = ["1-01", "1-02", "1-03", "1-04", "1-05"].map((c) => item(c));
  const a = layoutA(items, { handle: "momo" });
  assert.equal(a.background.color, "#f2f2f2");
  assert.equal(a.images.at(-1).item.code, "1-01");
  const hero = visible(a.images.at(-1).place, items[0]);
  close(hero.y + hero.height, 1290);
  for (const { place } of a.images.slice(0, -1)) assert.ok(place.y < 880, "부채는 가방 위쪽");
  const left = a.images[0].place;
  const right = a.images[3].place;
  assert.ok(left.rotation < 0 && right.rotation > 0);
  assert.deepEqual(a.texts.map((t) => t.content), ["What's in my bag", "@momo"]);
  // 9개 넘게 주면 9개까지만 (자리 10)
  assert.equal(layoutA(Array.from({ length: 14 }, (_, i) => item(`1-${i + 10}`)), { handle: "x" }).images.length, 10);
});

test("B 목록 — 열 수 규칙, 이름 · 번호 글자, 물건 밑선이 줄마다 같음", () => {
  const six = Array.from({ length: 6 }, (_, i) => item(`2-0${i + 1}`, `이름${i + 1}`));
  const b = layoutB(six, { title: "기숙사 책상" });
  assert.equal(b.background.color, "#ffffff");
  // 3열 2줄 → 같은 줄 물건 밑선 같음
  const bottoms = b.images.map(({ item: it, place }) => {
    const v = visible(place, it);
    return Math.round((v.y + v.height) * 1000) / 1000;
  });
  assert.equal(bottoms[0], bottoms[1]);
  assert.equal(bottoms[1], bottoms[2]);
  assert.ok(bottoms[3] > bottoms[0]);
  const contents = b.texts.map((t) => t.content);
  assert.deepEqual(contents.slice(0, 2), ["기숙사 책상", "아이템 6"]);
  assert.ok(contents.includes("이름6") && contents.includes("06"));
  assert.equal(b.texts.find((t) => t.content === "이름1").fontSize, 32, "3열 이름 32");
  assert.equal(layoutB([item("a-1"), item("a-2")], { title: "t" }).texts.find((t) => t.content === "a-1").fontSize, 38, "2열 38");
});

test("문서 — 앱 캔버스 형식, 아이템은 item:<번호> 자리표, 글자는 잰 뒤 자리 잡음, 다시 만들어도 같은 id", () => {
  const post = { id: postId("momo", "p1"), template: "B", title: "제목", canvasTitle: null };
  const doc = buildPostDocument(post, [item("1-01", "파우치"), item("1-02", "팩트")], { handle: "momo" });
  assert.equal(doc.version, 1);
  assert.equal(doc.width, 1080);
  assert.equal(doc.height, 1350);
  const images = doc.objects.filter((o) => o.kind === "item");
  assert.deepEqual(images.map((o) => o.src), ["item:1-01", "item:1-02"]);
  assert.deepEqual(buildPostDocument(post, [item("1-01"), item("1-02")], { handle: "momo" }).objects.map((o) => o.id), doc.objects.map((o) => o.id));

  const title = doc.objects.find((o) => o.kind === "text" && o.text === "제목");
  const placed = placeMeasuredText(title, 200);
  assert.equal(placed.x, 80, "왼쪽 맞춤은 왼쪽 끝이 x");
  close(placed.height, 76 * 1.3);
  close(placed.y, 130 - (76 * 1.3) / 2);
  assert.equal("anchor" in placed, false);
  const count = placeMeasuredText(doc.objects.find((o) => o.text === "아이템 2"), 100);
  assert.equal(count.x, 900, "오른쪽 맞춤은 오른쪽 끝이 x");
});

test("넣을 때 묶기 · 탭 영역 — 앱처럼 개체 자리를 비율로, 같은 아이템은 큰 쪽, 0~1 로 자름", () => {
  const doc = {
    version: 1, width: 1080, height: 1350, background: { kind: "color", color: "#fff" },
    objects: [
      { id: "a", kind: "item", code: "1-01", src: "item:1-01", x: -108, y: 135, width: 540, height: 675, rotation: 0 },
      { id: "b", kind: "item", code: "1-01", src: "item:1-01", x: 0, y: 0, width: 108, height: 135, rotation: 0 },
      { id: "t", kind: "text", text: "x", x: 0, y: 0, width: 10, height: 10, rotation: 0 },
    ],
  };
  const bound = bindDocument(doc, { itemIdOf: (c) => `id-${c}`, srcOf: (c) => `https://x/${c}.webp` });
  assert.equal(bound.objects[0].itemId, "id-1-01");
  assert.equal(bound.objects[0].src, "https://x/1-01.webp");
  assert.equal("code" in bound.objects[0], false);
  assert.deepEqual(itemAreas(bound), [{ itemId: "id-1-01", x: 0, y: 0.1, w: 0.5, h: 0.5 }]);
});

test("설정 검사 — 틀 · 제목 길이 · 자기 아이템만 · 자기 게시물 북마크 금지", () => {
  const errors = [];
  const fail = (w, m) => errors.push(`${w}: ${m}`);
  const user = { handle: "momo", inventories: [{ items: [{ code: "1-01" }, { code: "1-02" }] }] };
  const handles = { resolve: (ref) => ({ 1: "momo", 2: "juno", juno: "juno" })[ref] ?? null };
  const ok = normalizePosts([{ key: "p1", template: "A", title: "오늘", items: ["1-01", "1-02"], bookmarkedBy: [2, "juno"], image: "a.jpg", canvas: "a.json" }], user, { fail, file: (v) => v ?? null, handles });
  assert.deepEqual(errors, []);
  assert.deepEqual(ok[0].bookmarkedBy, ["juno"], "같은 사람은 한 번");
  assert.equal(ok[0].id, postId("momo", "p1"));
  normalizePosts(
    [
      { key: "x", template: "C", title: "a".repeat(41), items: ["2-01"], bookmarkedBy: [1, 9] },
      { key: "x", template: "B", title: "t", items: [] },
    ],
    user,
    { fail, file: () => null, handles },
  );
  const text = errors.join("\n");
  for (const want of ["template", "40자", "아이템이 아닙니다", "자기 게시물", "찾을 수 없습니다", "key x 가 겹칩니다", "items 가 비어"]) assert.match(text, new RegExp(want));
});

test("보이는 부분 찾기 — 투명 여백을 뺀 테두리", async () => {
  const png = await sharp({ create: { width: 100, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: { create: { width: 30, height: 20, channels: 4, background: { r: 200, g: 0, b: 0, alpha: 1 } } }, left: 10, top: 40 }])
    .png()
    .toBuffer();
  assert.deepEqual(await visibleBox(png), { width: 100, height: 80, bbox: { x: 10, y: 40, width: 30, height: 20 } });
});
