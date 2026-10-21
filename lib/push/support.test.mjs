// 설정 › 알림이 이 기기에서 무엇을 보여줄지 시험. npm run test:push
import { test } from "node:test";
import assert from "node:assert/strict";
import { deniedHelp, keyToBytes, pushState } from "./support.ts";

const base = { install: "installed", ios: false, hasServiceWorker: true, hasPushManager: true, hasNotification: true, permission: "default", hasKey: true };

test("아이폰 사파리 탭은 홈 화면에 추가 안내, 앱 안 브라우저는 따로", () => {
  assert.equal(pushState({ ...base, install: "ios", ios: true, hasPushManager: false }), "ios-tab");
  assert.equal(pushState({ ...base, install: "inapp" }), "inapp");
});

test("홈 화면 앱 · 안드로이드 · 데스크톱은 켤 수 있다, 막혔으면 막힘 안내", () => {
  assert.equal(pushState({ ...base, ios: true }), "ready");
  assert.equal(pushState({ ...base, install: "android" }), "ready");
  assert.equal(pushState({ ...base, install: "unsupported" }), "ready");
  assert.equal(pushState({ ...base, permission: "denied" }), "denied");
  assert.equal(pushState({ ...base, permission: "granted" }), "ready");
});

test("기능이나 키가 없으면 켤 수 없음", () => {
  for (const missing of ["hasServiceWorker", "hasPushManager", "hasNotification", "hasKey"]) {
    assert.equal(pushState({ ...base, [missing]: false }), "unsupported", missing);
  }
});

test("막혔을 때 푸는 곳", () => {
  assert.match(deniedHelp({ install: "installed", ios: true }), /아이폰 설정/);
  assert.match(deniedHelp({ install: "android", ios: false }), /휴대폰 설정/);
  assert.match(deniedHelp({ install: "unsupported", ios: false }), /사이트 설정/);
});

test("공개 키 바꾸기 — base64url 을 바이트로", () => {
  assert.deepEqual([...keyToBytes("AQID_-8")], [1, 2, 3, 255, 239]);
});
