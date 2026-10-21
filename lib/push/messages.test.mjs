// 웹 푸시 글자 · 날짜 · 받는 쪽 거르기 시험. npm run test:push
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  cleanKinds,
  commentMessage,
  expiryMessage,
  expiryWindow,
  followMessage,
  heartMessage,
  isGoneStatus,
  readPushPayload,
  safeAppPath,
  seoulDate,
} from "./messages.ts";

const actor = { id: "a1", nickname: "당니" };

test("문구는 알림 화면과 같고, 누르면 갈 곳 · 겹침 표식이 붙는다", () => {
  assert.deepEqual(followMessage(actor, "/u/dangnee"), { title: "INMYIN", body: "당니님이 회원님을 팔로우하기 시작했어요", url: "/u/dangnee", tag: "follow:a1" });
  const heart = heartMessage(actor, { kind: "post", id: "p1" }, "/inmyin/p1");
  assert.equal(heart.body, "당니님이 회원님의 INMYIN에 하트를 눌렀어요");
  assert.equal(heart.tag, "heart:a1:p1");
  assert.equal(heartMessage(actor, { kind: "item", id: "i1" }, "/items/i1").body, "당니님이 회원님의 아이템에 하트를 눌렀어요");
});

test("댓글은 40자까지 미리보기, 줄바꿈은 한 칸으로, 댓글마다 다른 알림", () => {
  const long = "가".repeat(45);
  const m = commentMessage(actor, { kind: "item", id: "i1" }, long, "c1", "/items/i1");
  assert.equal(m.body, `당니님이 회원님의 아이템에 댓글을 남겼어요: ${"가".repeat(40)}…`);
  assert.equal(m.tag, "comment:c1");
  assert.equal(commentMessage(actor, { kind: "item", id: "i1" }, "좋아\n\n요", "c2", "/x").body.endsWith(": 좋아 요"), true);
});

test("한국 날짜 — UTC 로 전날 15시면 한국은 다음 날", () => {
  assert.equal(seoulDate(new Date("2026-10-20T15:00:00Z")), "2026-10-21");
  assert.equal(seoulDate(new Date("2026-10-20T14:59:59Z")), "2026-10-20");
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
});

test("유통기한 범위 — 처음엔 오늘부터 3일 뒤까지, 다음 날은 새로 들어온 하루만, 같은 날 두 번은 없음", () => {
  assert.deepEqual(expiryWindow("2026-10-21", null, 3), { from: "2026-10-21", to: "2026-10-24" });
  assert.deepEqual(expiryWindow("2026-10-22", "2026-10-21", 3), { from: "2026-10-25", to: "2026-10-25" });
  assert.equal(expiryWindow("2026-10-21", "2026-10-21", 3), null);
  // 하루 빠지면 다음 날 이틀 치를 몰아서
  assert.deepEqual(expiryWindow("2026-10-23", "2026-10-21", 3), { from: "2026-10-25", to: "2026-10-26" });
  // 오래 쉬었으면 이미 지난 것은 빼고 오늘부터
  assert.deepEqual(expiryWindow("2026-11-30", "2026-10-01", 3), { from: "2026-11-30", to: "2026-12-03" });
  // 0일이면 당일만
  assert.deepEqual(expiryWindow("2026-10-21", null, 0), { from: "2026-10-21", to: "2026-10-21" });
});

test("범위가 이어 붙어서 같은 물건을 두 번 알리지 않는다", () => {
  const seen = new Map();
  let sentOn = null;
  for (let day = 0; day < 10; day += 1) {
    const today = addDays("2026-10-21", day);
    if (day === 4) continue; // 예약 실행이 하루 빠짐
    const range = expiryWindow(today, sentOn, 3);
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) seen.set(d, (seen.get(d) ?? 0) + 1);
    sentOn = today;
  }
  for (const [date, count] of seen) assert.equal(count, 1, date);
});

test("유통기한 알림 — 하나면 그 아이템으로, 여럿이면 모아보기로", () => {
  const urls = { item: (id) => `/items/${id}`, list: "/my/items" };
  assert.equal(expiryMessage([], "2026-10-21", urls), null);
  const one = expiryMessage([{ id: "i1", name: "우유", expiresAt: "2026-10-24" }], "2026-10-21", urls);
  assert.equal(one.body, "우유의 유통기한이 3일 남았어요");
  assert.equal(one.url, "/items/i1");
  assert.equal(one.tag, "expiry:2026-10-21");
  assert.equal(expiryMessage([{ id: "i1", name: "우유", expiresAt: "2026-10-21" }], "2026-10-21", urls).body, "우유의 유통기한이 오늘까지예요");
  const many = expiryMessage(
    [
      { id: "i1", name: "우유", expiresAt: "2026-10-22" },
      { id: "i2", name: "두부", expiresAt: "2026-10-23" },
      { id: "i3", name: "달걀", expiresAt: "2026-10-24" },
    ],
    "2026-10-21",
    urls,
  );
  assert.equal(many.body, "우유 외 2개의 유통기한이 다가와요");
  assert.equal(many.url, "/my/items");
});

test("받는 쪽은 이 사이트 안의 경로만 연다", () => {
  assert.equal(safeAppPath("/items/1"), "/items/1");
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", " /x", null, 3]) assert.equal(safeAppPath(bad), null, String(bad));
  assert.deepEqual(readPushPayload({ title: "INMYIN", body: "안녕", url: "https://evil.com", tag: "t" }), { title: "INMYIN", body: "안녕", url: "/notifications", tag: "t" });
  assert.deepEqual(readPushPayload(null), { title: "INMYIN", body: "새 알림이 있어요", url: "/notifications", tag: "inmyin" });
});

test("종류 거르기 · 끊긴 구독", () => {
  assert.deepEqual(cleanKinds(["comment", "follow", "follow", "spam"]), ["follow", "comment"]);
  assert.deepEqual(cleanKinds("follow"), []);
  assert.equal(isGoneStatus(410), true);
  assert.equal(isGoneStatus(404), true);
  assert.equal(isGoneStatus(429), false);
  assert.equal(isGoneStatus(undefined), false);
});
