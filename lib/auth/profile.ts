import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PROFILE_COLUMNS = "id, handle, nickname, avatar_url, bio, plan, grid_columns";

// 로그인한 사람과 그 사람의 프로필(users 행)을 가져온다 — 로그인 정보(user)까지 필요한 화면용 (가입 A-03, 설정 › 로그인 정보).
// getUser 는 Supabase 에 한 번 물어보고 오므로 화면마다 쓰기엔 아깝다. 화면들은 아래의 requireProfile 을 쓴다.
// cache 로 감싸서 한 번의 화면 요청 안에서는 여러 번 불러도 DB를 한 번만 읽는다.
export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase.from("users").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle();
  return { user, profile };
});

// 프로필만 빠르게. 로그인 토큰의 서명을 이 서버 안에서 확인하므로(getClaims) Supabase 에 물어보러 가지 않는다 —
// 화면마다 왕복 하나가 준다. 토큰이 무효인 경우(다른 기기에서 로그아웃 등)는 문지기(lib/supabase/proxy.ts)가 로그인 화면에서 잡는다
const getProfileByClaims = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { loggedIn: false, profile: null };

  const { data: profile } = await supabase.from("users").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
  return { loggedIn: true, profile };
});

// 프로필이 있어야 하는 화면의 맨 위에서 부른다.
// 로그인 전이면 A-01, 프로필을 아직 안 만들었으면 A-03 으로 보낸다.
export async function requireProfile() {
  const { loggedIn, profile } = await getProfileByClaims();
  if (!loggedIn) redirect("/login");
  if (!profile) redirect("/onboarding");
  return profile;
}
