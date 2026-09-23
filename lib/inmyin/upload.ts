import { extensionOf } from "@/lib/image/resize";
import { createClient } from "@/lib/supabase/client";
import type { CanvasDocument } from "./canvas";

// 포스팅(M-11) 전에 브라우저가 저장소에 올리는 것들. 파일 이름에 게시물 id 를 써서 서버가 주소를 다시 만들 수 있다.
// 완성 이미지 — <유저 id>/<게시물 id>.jpg
export async function uploadPostImage(image: Blob, userId: string, postId: string) {
  const { error } = await createClient().storage.from("posts").upload(`${userId}/${postId}.jpg`, image, { contentType: "image/jpeg" });
  if (error) throw error;
}

// 캔버스에 올린 갤러리 사진들 — 브라우저 안 주소(blob:)를 저장소 주소로 바꿔 넣은 새 문서를 돌려준다.
// 아이템 · 스티커는 이미 어디서나 열리는 주소라 그대로
export async function uploadCanvasPhotos(document: CanvasDocument, photos: Map<string, Blob>, userId: string, postId: string): Promise<CanvasDocument> {
  const storage = createClient().storage.from("posts");
  const objects = await Promise.all(
    document.objects.map(async (object) => {
      const blob = photos.get(object.id);
      if (!blob) return object;
      const path = `${userId}/${postId}-${object.id}.${extensionOf(blob)}`;
      const { error } = await storage.upload(path, blob, { contentType: blob.type });
      if (error) throw error;
      return { ...object, src: storage.getPublicUrl(path).data.publicUrl };
    }),
  );
  return { ...document, objects };
}
