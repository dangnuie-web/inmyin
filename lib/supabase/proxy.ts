import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

// 로그인 없이 볼 수 있는 주소. 2단계에서 피드와 타유저 프로필을 공개할 때 늘린다.
// PWA 몫: 매니페스트 · 서비스워커(/serwist/sw.js) · 오프라인 화면은 브라우저가 로그인과 상관없이 가져간다 —
// 로그인 화면으로 돌려보내면 앱 설치가 안 되거나 서비스워커가 로그인 화면을 저장해 버린다
const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/auth", "/design", "/manifest.webmanifest", "/serwist", "/offline"];
// 로그인한 사람에게는 필요 없는 주소
const GUEST_ONLY_PATHS = ["/login", "/signup"];

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

  if (!isLoggedIn && !matches(pathname, PUBLIC_PATHS)) {
    return redirectTo(request, response, "/login");
  }
  // 화면을 열 때(GET)만 돌려보낸다. 가입 도중의 폼 전송(POST)까지 막으면 가입이 끊긴다
  if (isLoggedIn && request.method === "GET" && matches(pathname, GUEST_ONLY_PATHS)) {
    return redirectTo(request, response, "/");
  }
  return response;
}

// 다른 주소로 보낼 때도 갱신된 쿠키는 그대로 들고 가야 한다
function redirectTo(request: NextRequest, response: NextResponse, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
