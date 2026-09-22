import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 로그인한 사람과 그 사람의 프로필(users 행)을 가져온다.
// cache 로 감싸서 한 번의 화면 요청 안에서는 여러 번 불러도 DB를 한 번만 읽는다.
export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("users")
    .select("id, handle, nickname, avatar_url, bio, plan, grid_columns")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
});

// 프로필이 있어야 하는 화면의 맨 위에서 부른다.
// 로그인 전이면 A-01, 프로필을 아직 안 만들었으면 A-03 으로 보낸다.
export async function requireProfile() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");
  return profile;
}
