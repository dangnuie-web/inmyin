import { NextResponse, type NextRequest } from "next/server";
import { NEXT_COOKIE, safeNext } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

// 구글·카카오 로그인 창에서 돌아오는 주소.
// 주소 뒤에 붙어 온 일회용 코드(code)를 로그인 쿠키로 바꾼다.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // 프로필이 아직 없으면 홈이 A-03 으로 보내준다. 구경하다 로그인하러 왔으면(쿠키 — signInWithProvider) 그 화면으로
    if (!error) {
      const next = safeNext(request.cookies.get(NEXT_COOKIE)?.value) ?? "/";
      const response = NextResponse.redirect(new URL(next, request.url));
      response.cookies.delete(NEXT_COOKIE);
      return response;
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth", request.url));
}
