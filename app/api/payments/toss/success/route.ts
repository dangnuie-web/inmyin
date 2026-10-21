import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { confirmPayment, readSuccessParams } from "@/lib/payments/confirm";
import { confirmDeps } from "@/lib/payments/orders";
import { createClient } from "@/lib/supabase/server";

// 토스 결제창의 successUrl. 토스가 ?paymentKey · orderId · amount 를 붙여 이리로 돌려보낸다.
// 이 값들은 브라우저를 거쳐 왔으니 믿지 않고, 서버의 주문과 맞춰 본 뒤 토스 승인 API 를 부른다(lib/payments/confirm.ts).
// 끝나면 결과 화면으로 보낸다 — 성공 /my/plan/success, 실패 /my/plan/fail?code=
// 로그인 전이면 문지기(proxy.ts)가 로그인으로 보냈다가 이 주소로 다시 데려온다
export async function GET(request: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url), 303);
  const fail = (code: string) => to(`/my/plan/fail?code=${encodeURIComponent(code)}`);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return to("/login");

  const input = readSuccessParams(Object.fromEntries(request.nextUrl.searchParams));
  if (!input) return fail("INVALID_REQUEST");

  const deps = confirmDeps();
  if (!deps) return fail("SERVER_ERROR");

  const result = await confirmPayment(userId, input, deps);
  if (!result.ok) return fail(result.code);

  // 한도 · 별이 바뀌었으니 내 화면들을 새로
  revalidatePath("/", "layout");
  return to("/my/plan/success");
}
