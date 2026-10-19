// 로그인 화면 주소와 "로그인한 뒤 돌아올 곳"(?next=). 문지기(lib/supabase/proxy.ts) · 화면 · 서버 함수가 같이 쓴다.

export const NEXT_PARAM = "next";
// 구글 · 카카오 로그인 창을 다녀오는 동안 돌아올 주소를 맡겨 두는 쿠키 (app/(auth)/actions.ts → app/auth/callback)
export const NEXT_COOKIE = "inmyin-next";

// 랜딩의 "유저 인벤토리 보기"가 가는 곳 — 로그인 없이 구경할 수 있는 발견 탭
export const DISCOVER_PATH = "/discover";

// 로그인 화면. next 를 주면 로그인한 뒤 그 주소로 돌아온다
export function loginPath(next?: string | null) {
  const safe = safeNext(next);
  return safe ? `/login?${NEXT_PARAM}=${encodeURIComponent(safe)}` : "/login";
}

// 돌아올 주소로 써도 되는지. 이 사이트 안의 주소(/ 로 시작)만 받는다 —
// //다른사이트 · /\다른사이트 처럼 바깥으로 튀는 주소, 로그인 · 가입 화면 자신(되돌아오면 빙빙 돈다)은 버린다
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  // 줄바꿈 같은 제어 문자가 섞이면 버린다
  if ([...value].some((char) => char.charCodeAt(0) < 0x20)) return null;
  // 브라우저가 읽는 방식으로 한 번 더 — 다른 곳으로 풀리면 버린다
  if (new URL(value, "http://inmyin.local").origin !== "http://inmyin.local") return null;
  const pathname = value.split(/[?#]/)[0];
  if (["/login", "/signup", "/welcome", "/auth"].some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;
  return value;
}
