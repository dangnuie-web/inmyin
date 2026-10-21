import Link from "next/link";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { NumText } from "@/components/ui/NumText";
import { StickyTop } from "@/components/ui/StickyTop";
import { failMessage, isCancelCode } from "@/lib/payments/confirm";
import { PREMIUM_PASS } from "@/lib/plans";
import { PlanCompare, formatUntil } from "./PlanCompare";
import { PremiumCheckout } from "./PremiumCheckout";
import { TestModeNotice } from "./TestModeNotice";

// 프리미엄 · 결제 완료 · 결제 안 됨 화면의 몸통. 무엇을 보여줄지는 화면(app/(main)/my/plan/)이 DB에서 읽어 넘긴다 —
// 여기는 그리기만 해서 디자인 확인용 미리보기에서도 같은 것을 그린다

// 프리미엄(플랜) 화면. 베이직: 한도 비교 + 한 달 이용권 결제. 프리미엄: 언제까지인지
export function PlanView({ isPremium, until, back }: { isPremium: boolean; until: string | null; back: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <StickyTop>
        <HeaderMini icon="back" href={back} title="프리미엄" />
      </StickyTop>

      <div className="flex flex-1 flex-col px-5 pb-10">
        <TestModeNotice className="mt-2" />

        <section className="mt-8">
          {isPremium ? (
            <>
              <p className="text-title font-bold">프리미엄 이용중</p>
              <p className="mt-1 text-body text-ink-muted">
                {until ? <NumText text={`${formatUntil(until)}까지`} /> : "기간 정보가 없어요"}
              </p>
            </>
          ) : (
            <>
              <p className="text-title font-bold">
                <span aria-hidden>✦ </span>프리미엄
              </p>
              <p className="mt-1 text-body">
                <NumText text={`월 ${PREMIUM_PASS.price.toLocaleString("ko-KR")}원`} />
                <span className="text-ink-muted"> · 한 달 이용권</span>
              </p>
            </>
          )}
        </section>

        <div className="mt-6">
          <PlanCompare />
        </div>

        <p className="mt-4 break-keep text-caption text-ink-muted">
          한 번 결제하면 한 달 동안 쓸 수 있어요. 자동으로 다시 결제되지 않아요.
        </p>

        {!isPremium && (
          <div className="mt-auto pt-10">
            <PremiumCheckout price={PREMIUM_PASS.price} />
          </div>
        )}
      </div>
    </div>
  );
}

// 결제 완료. 프리미엄이 아니면(그사이 무슨 일이 있었으면) 다시 확인하라는 안내
export function PlanSuccessView({ isPremium, until }: { isPremium: boolean; until: string | null }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6 pb-10">
      <TestModeNotice />
      <section className="mt-10 text-center">
        <p className="text-title font-bold">{isPremium ? "프리미엄이 됐어요" : "아직 프리미엄이 아니에요"}</p>
        <p className="mt-1 text-body text-ink-muted">
          {isPremium ? (until ? <NumText text={`${formatUntil(until)}까지 쓸 수 있어요`} /> : "지금부터 쓸 수 있어요") : "플랜 화면에서 다시 확인해 주세요."}
        </p>
      </section>
      {isPremium && (
        <div className="mt-8">
          <PlanCompare />
        </div>
      )}
      <div className="mt-auto flex flex-col gap-3 pt-10">
        <Link href="/my" className="flex h-14 w-full items-center justify-center rounded-md bg-ink text-body font-semibold text-white active:opacity-80">
          내 프로필로
        </Link>
      </div>
    </div>
  );
}

// 결제 실패 · 취소. 코드만 받는다(주소의 message 는 쓰지 않는다)
export function PlanFailView({ code }: { code: string }) {
  const canceled = isCancelCode(code);
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6 pb-10">
      <TestModeNotice />
      <section className="mt-10 text-center">
        <p className="text-title font-bold">{canceled ? "결제를 취소했어요" : "결제를 마치지 못했어요"}</p>
        <p className="mt-1 break-keep text-body text-ink-muted">{canceled ? "언제든 다시 할 수 있어요." : failMessage(code)}</p>
      </section>
      <div className="mt-auto flex flex-col gap-3 pt-10">
        <Link href="/my/plan" className="flex h-14 w-full items-center justify-center rounded-md bg-ink text-body font-semibold text-white active:opacity-80">
          다시 결제하기
        </Link>
        <Link href="/my" className="flex h-14 w-full items-center justify-center rounded-md border border-disabled bg-white text-body font-semibold text-ink active:opacity-80">
          내 프로필로
        </Link>
      </div>
    </div>
  );
}
