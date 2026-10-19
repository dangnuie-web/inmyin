import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "@/lib/auth/paths";
import type { Database } from "./database.types";

// 로그인 없이 볼 수 있는 주소.
// PWA 몫: 매니페스트 · 서비스워커(/serwist/sw.js) · 오프라인 화면은 브라우저가 로그인과 상관없이 가져간다 —
// 로그인 화면으로 돌려보내면 앱 설치가 안 되거나 서비스워커가 로그인 화면을 저장해 버린다
const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/auth", "/design", "/manifest.webmanifest", "/serwist", "/offline", "/terms", "/privacy", "/welcome"];
// 로그인 없이 구경할 수 있는 화면 — 발견 · INMYIN 목록 · INMYIN 상세 · 아이템 상세 · 타유저 프로필(인벤토리 · 아이템 · INMYIN · 팔로워).
// 남의 공개된 것만 보이는 것은 DB 규칙(RLS)이 지킨다. 같은 묶음이라도 /items/[id]/edit 처럼 고치는 화면은 여기에 들지 않는다.
// My · Bookmark · 알림 · 촬영 · 에디터는 그대로 로그인 필요
const GUEST_BROWSE_PATTERNS = [
  /^\/discover$/,
  /^\/inmyin$/,
  /^\/inmyin\/[^/]+$/,
  /^\/items\/[^/]+$/,
  /^\/u\/[^/]+(\/(inventories(\/[^/]+)?|items|inmyin|follows))?$/,
];
// 로그인한 사람에게는 필요 없는 주소 (/welcome = 랜딩)
const GUEST_ONLY_PATHS = ["/login", "/signup", "/welcome"];
// 로그인 안 한 사람이 / 에 오면 보여줄 랜딩. 주소창은 / 그대로 두고 내용만 바꿔 끼운다(rewrite)
const LANDING_PATH = "/welcome";

function matches(pathname: string, paths: string[]) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

// proxy.ts 가 요청마다 부른다.
// 1) 만료가 가까운 로그인 쿠키를 새것으로 바꾸고 2) 로그인 여부에 따라 갈 곳을 정한다.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // createServerClient 와 getClaims 사이에 다른 코드를 넣지 않는다.
  // 쿠키 갱신이 여기서 일어나서, 사이에 끼어들면 로그인이 이유 없이 풀릴 수 있다.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!isLoggedIn && pathname === "/") {
    return rewriteTo(request, response, LANDING_PATH);
  }
  if (!isLoggedIn && !matches(pathname, PUBLIC_PATHS) && !GUEST_BROWSE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    // 로그인한 뒤 원래 가려던 화면으로 돌아오게 주소를 실어 보낸다 (화면을 열 때만 — 폼 전송은 돌아갈 화면이 아니다)
    return redirectTo(request, response, request.method === "GET" ? loginPath(pathname + visibleSearch(request)) : "/login");
  }
  // 화면을 열 때(GET)만 돌려보낸다. 가입 도중의 폼 전송(POST)까지 막으면 가입이 끊긴다
  if (isLoggedIn && request.method === "GET" && matches(pathname, GUEST_ONLY_PATHS)) {
    // 다른 기기에서 로그아웃하면 모든 기기의 로그인이 끊기는데, 이 기기의 쿠키에 남은 토큰은 겉보기엔 멀쩡하다.
    // 그대로 / 로 보내면 / 가 서버에 물어보고 무효라며 다시 /login 으로 보내 무한 반복이 된다.
    // 그래서 로그인 화면에 올 때만 서버에 한 번 확인하고, 무효면 쿠키를 지우고 로그인 화면을 그대로 보여준다
    const { error } = await supabase.auth.getUser();
    if (error) {
      await supabase.auth.signOut({ scope: "local" });
      return response;
    }
    return redirectTo(request, response, "/");
  }
  return response;
}

// 다른 주소로 보낼 때도 갱신된 쿠키는 그대로 들고 가야 한다. target 은 ?뒤까지 들어 있을 수 있다 (/login?next=…)
function redirectTo(request: NextRequest, response: NextResponse, target: string) {
  const redirect = NextResponse.redirect(new URL(target, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

// 주소는 그대로 두고 다른 화면을 보여줄 때도 갱신된 쿠키는 그대로 들고 간다
function rewriteTo(request: NextRequest, response: NextResponse, pathname: string) {
  // ?뒤는 그대로 둔다 — 화면 사이를 옮겨 다닐 때 Next 가 붙이는 표식(_rsc)도 들어 있다
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const rewrite = NextResponse.rewrite(url);
  response.cookies.getAll().forEach((cookie) => rewrite.cookies.set(cookie));
  return rewrite;
}

// 돌아올 주소에 실을 ?뒤. Next 가 화면 사이를 옮길 때 붙이는 표식(_rsc)은 사람이 보는 주소가 아니라서 뺀다
function visibleSearch(request: NextRequest) {
  const params = new URLSearchParams(request.nextUrl.search);
  params.delete("_rsc");
  const query = params.toString();
  return query ? `?${query}` : "";
}
