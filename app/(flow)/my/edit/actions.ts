"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN, NICKNAME_MAX, type FormState } from "@/lib/auth/rules";
import { createClient } from "@/lib/supabase/server";

// uploadAvatar 가 지어 주는 이름: "<무작위 id>.<확장자>"
const AVATAR_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/;

export type ProfileInput = {
  nickname: string;
  handle: string;
  // 새로 올린 프로필 사진의 파일 이름. 사진을 바꾸지 않았으면 null
  avatarFile: string | null;
};

// 프로필 관리. 닉네임 · 아이디 · 프로필 사진을 고친다. 규칙은 프로필을 처음 만들 때(A-03)와 같다
export async function updateProfile(input: ProfileInput): Promise<FormState> {
  const profile = await requireProfile();

  const nickname = typeof input.nickname === "string" ? input.nickname.trim() : "";
  if (!nickname || nickname.length > NICKNAME_MAX) return { error: `닉네임은 1~${NICKNAME_MAX}자로 입력해 주세요.` };

  const handle = typeof input.handle === "string" ? input.handle.trim().toLowerCase() : "";
  if (!HANDLE_PATTERN.test(handle)) return { error: "아이디는 영소문자·숫자·밑줄(_)로 3~30자여야 합니다." };

  if (input.avatarFile !== null && !AVATAR_FILE_PATTERN.test(input.avatarFile)) {
    return { error: "잘못된 요청입니다. 처음부터 다시 시도해 주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({
      nickname,
      handle,
      // 주소는 브라우저가 보낸 값을 믿지 않고 여기서 만든다 — 항상 내 폴더 안의 파일만 가리킨다
      ...(input.avatarFile && {
        avatar_url: supabase.storage.from("avatars").getPublicUrl(`${profile.id}/${input.avatarFile}`).data.publicUrl,
      }),
    })
    .eq("id", profile.id);
  if (error) {
    // 23505 = 중복. 아이디는 사람마다 달라야 한다
    return { error: error.code === "23505" ? "이미 사용 중인 아이디입니다." : "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/my", "layout");
  redirect("/my");
}
