// 토스페이먼츠 서버 API (결제창 · API 개별 연동). 서버 코드에서만 — 비밀 키(TOSS_SECRET_KEY)를 쓴다.
// 화면 쪽 코드("use client")에서 불러오지 않는다. 4단계는 테스트 키(test_sk_)라 실제 돈은 안 나간다
import type { TossPayment, TossResult } from "./confirm";

const API = "https://api.tosspayments.com/v1/payments";

function authHeader() {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) return null;
  // 토스 규칙: "비밀키 + 콜론"을 base64 로
  return `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
}

async function call(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<TossResult> {
  const auth = authHeader();
  if (!auth) return { ok: false, code: "NO_SECRET_KEY", message: "", retryable: true };
  try {
    const res = await fetch(`${API}${path}`, {
      method: init.method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.ok && data) {
      const payment: TossPayment = {
        paymentKey: String(data.paymentKey ?? ""),
        orderId: String(data.orderId ?? ""),
        status: String(data.status ?? ""),
        totalAmount: Number(data.totalAmount),
      };
      return { ok: true, payment };
    }
    // 4xx 는 토스가 거절한 것(다시 해도 같다), 5xx 는 토스 쪽 문제(다시 해 볼 수 있다)
    return {
      ok: false,
      code: typeof data?.code === "string" ? data.code : `HTTP_${res.status}`,
      message: typeof data?.message === "string" ? data.message : "",
      retryable: res.status >= 500,
    };
  } catch {
    return { ok: false, code: "NETWORK_ERROR", message: "", retryable: true };
  }
}

// 결제 승인. 이걸 불러야 실제로 결제가 끝난다(안 부르면 10분 뒤 사라진다)
export function tossConfirm(input: { paymentKey: string; orderId: string; amount: number }) {
  return call("/confirm", { method: "POST", body: input });
}

// 결제 조회 — 승인이 이미 됐는지 확인할 때
export function tossGetPayment(paymentKey: string) {
  return call(`/${encodeURIComponent(paymentKey)}`, { method: "GET" });
}
