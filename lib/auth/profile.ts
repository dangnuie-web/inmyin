import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// created_at · notifications_seen_at 은 알림 화면이 "새것"을 가르는 기준
const PROFILE_COLUMNS = "id, handle, nickname, avatar_url, bio, plan, grid_columns, created_at, notifications_seen_at";

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

// 로그인했는지만 — 웹 상단 바의 로그아웃 · 로그인 자리(components/ui/WebNavAccount)용.
// 같은 요청 안의 화면(requireProfile · getViewer)과 cache 를 같이 써서 따로 묻지 않는다
export async function isLoggedIn() {
  const { loggedIn } = await getProfileByClaims();
  return loggedIn;
}

// 프로필이 있어야 하는 화면의 맨 위에서 부른다.
// 로그인 전이면 A-01, 프로필을 아직 안 만들었으면 A-03 으로 보낸다.
export async function requireProfile() {
  const { loggedIn, profile } = await getProfileByClaims();
  if (!loggedIn) redirect("/login");
  if (!profile) redirect("/onboarding");
  return profile;
}

// 로그인 없이도 열리는 구경 화면(발견 · INMYIN · 타유저 프로필 · 아이템 · INMYIN 상세)의 맨 위에서 부른다.
// 로그인 전이면 null — 화면은 남의 공개된 것만 보여주고, 하트 · 북마크 · 팔로우 · 댓글은 누르면 로그인으로 보낸다.
// 로그인은 했는데 프로필이 없으면 다른 화면처럼 A-03 으로. 무엇이 보이는지는 DB 규칙(RLS)이 정한다 — 로그인 전에는 공개된 것만 온다
export async function getViewer() {
  const { loggedIn, profile } = await getProfileByClaims();
  if (!loggedIn) return null;
  if (!profile) redirect("/onboarding");
  return profile;
}
