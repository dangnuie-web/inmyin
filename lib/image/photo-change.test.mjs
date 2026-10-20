// 수정 화면의 사진 바꾸기 시험 — 쓰던 값 맡기기 · 돌아온 사진 고르기 (pending-photo.ts) · 저장 경로 거르기 (stored-photo.ts). npm run test:image
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearPhotoChange,
  getPendingPhoto,
  peekEditedPhoto,
  peekPhotoChangeDraft,
  savePhotoChangeDraft,
  setPendingPhoto,
} from "./pending-photo.ts";
import { newPhotoPaths } from "./stored-photo.ts";

const photo = (name, edited) => ({ photo: { name }, raw: { name: `${name}-raw` }, ...(edited ? { edited: true } : {}) });
const USER = "11111111-2222-3333-4444-555555555555";
const PHOTO_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

test("맡긴 값은 같은 화면만 찾아간다", () => {
  clearPhotoChange();
  savePhotoChangeDraft("item:a", { name: "컵" });
  assert.equal(peekPhotoChangeDraft("item:b"), null);
  assert.equal(peekPhotoChangeDraft("inventory:a"), null);
  assert.deepEqual(peekPhotoChangeDraft("item:a"), { name: "컵" });
});

test("읽기만 해서는 안 비고(개발 모드 두 번 읽기), clear 하면 빈다", () => {
  clearPhotoChange();
  savePhotoChangeDraft("item:a", { name: "컵" });
  setPendingPhoto(photo("새", true));
  assert.deepEqual(peekPhotoChangeDraft("item:a"), { name: "컵" });
  assert.deepEqual(peekPhotoChangeDraft("item:a"), { name: "컵" });
  assert.equal(peekEditedPhoto()?.photo.name, "새");
  clearPhotoChange();
  assert.equal(peekPhotoChangeDraft("item:a"), null);
  assert.equal(peekEditedPhoto(), null);
  assert.equal(getPendingPhoto(), null);
});

test("사진편집 저장하기를 거친 사진만 새 사진 — 촬영 · 사진편집을 닫고 오면 원래대로", () => {
  clearPhotoChange();
  // 촬영에서 찍고 사진편집에서 뒤로 → 촬영에서 × : 손대지 않은 사진이 보관함에 남아 있다
  setPendingPhoto(photo("찍기만", false));
  assert.equal(peekEditedPhoto(), null);
  setPendingPhoto(photo("편집함", true));
  assert.equal(peekEditedPhoto()?.photo.name, "편집함");
});

test("저장 경로 — 내 폴더 · 새 id · 정해진 확장자만", () => {
  assert.deepEqual(newPhotoPaths(USER, { photoId: PHOTO_ID, imageExtension: "png", rawImageExtension: "jpg" }), {
    path: `${USER}/${PHOTO_ID}.png`,
    rawPath: `${USER}/${PHOTO_ID}.jpg`,
  });
  assert.equal(newPhotoPaths(USER, { photoId: "../남의폴더/x", imageExtension: "png", rawImageExtension: "jpg" }), null);
  assert.equal(newPhotoPaths(USER, { photoId: PHOTO_ID, imageExtension: "gif", rawImageExtension: "jpg" }), null);
  assert.equal(newPhotoPaths(USER, { photoId: PHOTO_ID, imageExtension: "webp", rawImageExtension: "svg" }), null);
  assert.equal(newPhotoPaths(USER, null), null);
});
