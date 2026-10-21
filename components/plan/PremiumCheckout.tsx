"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { NumText } from "@/components/ui/NumText";
import { startPremiumOrder } from "@/app/(main)/my/plan/actions";

// 토스페이먼츠 결제창 SDK v2. 패키지 설치 없이 공식 스크립트 한 줄로 부른다
const SDK_URL = "https://js.tosspayments.com/v2/standard";

type TossPaymentsFn = (clientKey: string) => {
  payment(options: { customerKey: string }): {
    requestPayment(request: {
      method: "CARD";
      amount: { currency: "KRW"; value: number };
      orderId: string;
      orderName: string;
      successUrl: string;
      failUrl: string;
    }): Promise<void>;
  };
};

declare global {
  interface Window {
    TossPayments?: TossPaymentsFn;
  }
}

let sdkPromise: Promise<TossPaymentsFn> | null = null;

function loadSdk() {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  sdkPromise ??= new Promise<TossPaymentsFn>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error("sdk")));
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("sdk"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

// 프리미엄 화면 아래의 "결제하기". 누르면: 서버가 주문을 만든다 → 토스 결제창 → 토스가 성공(/api/payments/toss/success) · 실패(/my/plan/fail)로 보낸다.
// 금액 · 주문 번호는 서버가 준 값을 그대로 넘긴다. 승인 여부는 서버가 토스에 다시 물어 정한다 — 여기서 정하지 않는다
export function PremiumCheckout({ price }: { price: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  // 화면을 열면 결제창 스크립트를 미리 받아 둔다 — 누른 뒤 기다림이 준다
  useEffect(() => {
    loadSdk().catch(() => {});
  }, []);

  function pay() {
    setError(undefined);
    startTransition(async () => {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        setError("결제를 아직 준비하지 못했어요. 잠시 뒤 다시 해 주세요.");
        return;
      }
      const order = await startPremiumOrder();
      if (!order.ok) {
        setError(order.message);
        return;
      }
      try {
        const TossPayments = await loadSdk();
        const origin = window.location.origin;
        await TossPayments(clientKey)
          .payment({ customerKey: order.customerKey })
          .requestPayment({
            method: "CARD",
            amount: { currency: "KRW", value: order.amount },
            orderId: order.orderId,
            orderName: order.orderName,
            successUrl: `${origin}/api/payments/toss/success`,
            failUrl: `${origin}/my/plan/fail`,
          });
      } catch (e) {
        // 컴퓨터의 결제창(화면 위에 뜨는 창)을 닫으면 USER_CANCEL 로 여기 온다. 폰은 failUrl 로 간다
        const code = typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
        if (code === "USER_CANCEL") router.push("/my/plan/fail?code=USER_CANCEL");
        else setError("결제창을 열지 못했어요. 잠시 뒤 다시 해 주세요.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <FormError message={error} />
      <Button onClick={pay} disabled={pending}>
        {/* 한 덩이로 감싼다 — 버튼의 gap 이 숫자와 글자 사이를 벌리지 않게 */}
        <span>
          <NumText text={pending ? "결제창 여는 중" : `${price.toLocaleString("ko-KR")}원 결제하기`} />
        </span>
      </Button>
    </div>
  );
}
