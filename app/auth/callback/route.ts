import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 구글·카카오 로그인 창에서 돌아오는 주소.
// 주소 뒤에 붙어 온 일회용 코드(code)를 로그인 쿠키로 바꾼다.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // 프로필이 아직 없으면 홈이 A-03 으로 보내준다
    if (!error) return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(new URL("/login?error=oauth", request.url));
}
