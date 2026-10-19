import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BagScene } from "@/components/landing/BagScene";
import { DISCOVER_PATH, loginPath } from "@/lib/auth/paths";

export const metadata: Metadata = {
  title: "INMYIN · In my inventory",
  description: "인벤토리를 보면 사람이 보인다. 내 물건을 찍어 칸에 꽂고, 남의 인벤토리를 구경하는 곳.",
};

// 랜딩 — 로그인 안 한 사람이 / 에 오면 보이는 첫 화면 (문지기 lib/supabase/proxy.ts 가 / 를 여기로 바꿔 보여준다. 주소창은 / 그대로).
// 피그마 S-00 스플래시(웹)를 바탕으로, 0단계 결정대로 흑백 — 보라 점 · 별은 빼고 말풍선은 검은 테두리. 색은 물건 사진만 낸다.
// 폰이 기본이고 웹(1024px 이상)은 같은 것을 크게. 로그인한 사람이 /welcome 을 열면 홈으로 보낸다 (문지기)
export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-5 pt-16 pb-10 lg:max-w-web lg:pt-24 lg:pb-16">
        <h1 className="flex flex-col items-center gap-3 lg:gap-5">
          <Image src="/logo.svg" alt="INMYIN" width={146} height={31} priority className="h-auto w-52 lg:w-110" />
          <span className="text-title lg:text-4xl">In my inventory</span>
        </h1>

        {/* 가방에서 아이템이 튀어나와 칸에 꽂히는 연출 (그림 · 움직임 값은 lib/landing/scene.ts) */}
        <div className="mt-4 w-full lg:mt-6">
          <BagScene />
        </div>

        <Bubble className="mt-5 lg:mt-6">
          내 아이템을 올리고
          <br />
          내 취향을 표현해 보자!
        </Bubble>

        {/* 버튼 위계: 주 버튼(가입 · 로그인)만 검정으로 채우고, 구경하기는 외곽선 */}
        <div className="mt-auto flex w-full flex-col gap-3 pt-12 lg:mt-14 lg:w-auto lg:flex-row-reverse lg:gap-4 lg:pt-0">
          <Link href={loginPath()} className="flex h-14 items-center justify-center rounded-full bg-ink text-body font-bold text-white active:opacity-80 lg:w-60">
            가입 · 로그인
          </Link>
          <Link href={DISCOVER_PATH} className="flex h-14 items-center justify-center rounded-full border-2 border-ink bg-white text-body font-bold text-ink active:opacity-60 lg:w-60">
            유저 인벤토리 보기
          </Link>
        </div>
      </div>

      {/* 맨 아래 검은 띠의 슬로건. 아이폰 홈 막대만큼 아래 여백 */}
      <footer className="flex min-h-16 items-center justify-center bg-ink px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-body font-bold text-white lg:min-h-21 lg:text-title">
        인벤토리를 보면 사람이 보인다.
      </footer>
    </main>
  );
}

// 말풍선 — 흰 바탕에 검은 테두리, 위쪽 가운데에 꼬리 (가방을 가리킨다)
function Bubble({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`relative rounded-md border-2 border-ink bg-white px-4 py-2.5 text-center text-label font-semibold break-keep ${className}`}>
      <span aria-hidden className="absolute -top-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-t-2 border-l-2 border-ink bg-white" />
      {children}
    </p>
  );
}
