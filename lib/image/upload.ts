import { createClient } from "@/lib/supabase/client";
import type { PendingPhoto } from "./pending-photo";
import { extensionOf, RAW_MAX_SIDE, resizeImage, THUMBNAIL_MAX_SIDE } from "./resize";

// 사진을 줄여서 썸네일과 원본을 둘 다 올린다 (CLAUDE.md 규칙 7).
// 저장소는 "<이름>" 과 "<이름>-raw" 한 쌍이고, 파일 경로는 <유저 id>/<대상 id>.<확장자> 다.
// 썸네일은 편집(M-07)에서 배경을 지웠으면 배경이 투명하고, 원본은 언제나 찍힌 그대로다.
// 둘의 확장자가 다를 수 있어서 (사파리에서 배경을 지우면 썸네일은 png, 원본은 jpg) 둘 다 돌려준다
export async function uploadPhotoPair(
  bucket: "inventories" | "items",
  { photo, raw: rawPhoto }: PendingPhoto,
  userId: string,
  targetId: string,
) {
  const [thumbnail, raw] = await Promise.all([
    resizeImage(photo, THUMBNAIL_MAX_SIDE),
    resizeImage(rawPhoto, RAW_MAX_SIDE),
  ]);
  const imageExtension = extensionOf(thumbnail);
  const rawImageExtension = extensionOf(raw);

  const storage = createClient().storage;
  const results = await Promise.all([
    storage.from(bucket).upload(`${userId}/${targetId}.${imageExtension}`, thumbnail, { contentType: thumbnail.type }),
    storage.from(`${bucket}-raw`).upload(`${userId}/${targetId}.${rawImageExtension}`, raw, { contentType: raw.type }),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  return { imageExtension, rawImageExtension };
}

// 프로필 사진으로 쓰기에 넉넉한 크기. 화면에는 지름 98px 로 나온다 (3배 화면이면 294px)
const AVATAR_MAX_SIDE = 320;

// 프로필 사진을 줄여서 올리고, 올린 파일의 이름을 돌려준다 ("<무작위 id>.<확장자>").
// 바꿀 때마다 새 이름으로 올린다 — 같은 이름으로 덮어쓰면 브라우저가 옛 사진을 계속 보여준다
export async function uploadAvatar(photo: File, userId: string) {
  const avatar = await resizeImage(photo, AVATAR_MAX_SIDE);
  const fileName = `${crypto.randomUUID()}.${extensionOf(avatar)}`;

  const { error } = await createClient().storage.from("avatars").upload(`${userId}/${fileName}`, avatar, { contentType: avatar.type });
  if (error) throw error;
  return fileName;
}
