import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// 모든 화면 요청 앞에서 먼저 실행되는 문지기.
// Next.js 16 부터 middleware.ts 가 proxy.ts 로 이름이 바뀌었다.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 이미지·폰트 같은 정적 파일은 로그인과 상관없으니 건너뛴다
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
