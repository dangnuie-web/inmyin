import { createClient } from "@/lib/supabase/client";
import type { PendingPhoto } from "./pending-photo";
import { extensionOf, RAW_MAX_SIDE, resizeImage, THUMBNAIL_MAX_SIDE } from "./resize";

// 사진을 줄여서 썸네일과 원본을 둘 다 올린다 (CLAUDE.md 규칙 7).
// 저장소는 "<이름>" 과 "<이름>-raw" 한 쌍이고, 파일 경로는 <유저 id>/<대상 id>.<확장자> 다.
// 편집(M-07)이 생기기 전이라 썸네일도 배경이 그대로다. 올린 파일의 확장자를 돌려준다
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
  const extension = extensionOf(thumbnail);
  const path = `${userId}/${targetId}.${extension}`;

  const storage = createClient().storage;
  const results = await Promise.all([
    storage.from(bucket).upload(path, thumbnail, { contentType: thumbnail.type }),
    storage.from(`${bucket}-raw`).upload(path, raw, { contentType: raw.type }),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;

  return extension;
}
