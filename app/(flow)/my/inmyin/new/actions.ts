"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import type { FormState } from "@/lib/auth/rules";
import type { CanvasDocument } from "@/lib/inmyin/canvas";
import { POST_DESCRIPTION_MAX, POST_TITLE_MAX, type PostItemArea } from "@/lib/inmyin/rules";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type NewPostInput = {
  // 브라우저가 미리 정한 id. 이미지를 먼저 올려야 해서 파일 이름에 이 id 를 쓴다
  id: string;
  title: string;
  description: string;
  // 캔버스 저장 형태. 갤러리 사진의 주소는 브라우저가 저장소에 올린 뒤 바꿔 넣어 보낸다
  canvas: CanvasDocument;
  items: PostItemArea[];
};

const inRange = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

// M-11 · 포스팅. 완성 이미지(<유저 id>/<게시물 id>.jpg)는 브라우저가 저장소에 먼저 올려 두고, 여기서는 DB 에 적는다.
// 탭 영역(post_items)은 캔버스에 올린 아이템에서 나온다 — 남의 아이템은 DB 규칙이 막는다
export async function createPost(input: NewPostInput): Promise<FormState> {
  const profile = await requireProfile();

  const title = input.title.trim();
  const description = input.description.trim();
  if (!UUID_PATTERN.test(input.id)) return { error: "잘못된 요청입니다. 처음부터 다시 시도해 주세요." };
  if (!title) return { error: "제목을 입력해 주세요." };
  if (title.length > POST_TITLE_MAX) return { error: `제목은 ${POST_TITLE_MAX}자까지 쓸 수 있어요.` };
  if (description.length > POST_DESCRIPTION_MAX) return { error: `내용은 ${POST_DESCRIPTION_MAX}자까지 쓸 수 있어요.` };
  if (input.canvas?.version !== 1 || !Array.isArray(input.canvas.objects)) return { error: "잘못된 요청입니다. 처음부터 다시 시도해 주세요." };
  // 갤러리 사진이 브라우저 안 주소(blob:)로 남아 있으면 남에게 안 보인다 — 올리기 전에 바꿔 넣었어야 한다
  if (input.canvas.objects.some((object) => !/^https?:\/\//.test(object.src) && !object.src.startsWith("/"))) return { error: "사진을 올리지 못했어요. 다시 시도해 주세요." };
  if (!input.items.every((item) => UUID_PATTERN.test(item.itemId) && [item.x, item.y, item.w, item.h].every(inRange))) return { error: "잘못된 요청입니다. 처음부터 다시 시도해 주세요." };

  const supabase = await createClient();
  // 주소는 브라우저가 보낸 값을 믿지 않고 여기서 만든다 — 항상 내 폴더 안의 파일만 가리킨다
  const path = `${profile.id}/${input.id}.jpg`;
  const { error } = await supabase.from("inmyin_posts").insert({
    id: input.id,
    user_id: profile.id,
    title,
    description: description || null,
    image_url: supabase.storage.from("posts").getPublicUrl(path).data.publicUrl,
    canvas_json: input.canvas,
  });
  if (error) return { error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  if (input.items.length > 0) {
    const { error: itemsError } = await supabase.from("post_items").insert(input.items.map((item) => ({ post_id: input.id, item_id: item.itemId, x: item.x, y: item.y, w: item.w, h: item.h })));
    if (itemsError) return { error: "아이템 표시를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/my");
  redirect("/my");
}
