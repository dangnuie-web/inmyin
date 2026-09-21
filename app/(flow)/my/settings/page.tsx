import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { SoonButton } from "@/components/profile/SoonButton";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { formatShortDate } from "@/lib/item/rules";

export const metadata: Metadata = { title: "설정 · INMYIN" };

const ROW_CLASS = "flex h-12 w-full items-center border-b border-gray-3 text-left text-body active:opacity-60";

// M-02 · My › 설정. 내 프로필(M-01)의 톱니에서 온다. 하단 탭이 없다.
export default async function SettingsPage() {
  const profile = await requireProfile();
  const isPremium = profile.plan === "premium";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <HeaderMini icon="back" href="/my" title="설정" />

      <div className="flex flex-col px-6.5 pb-10">
        <Section title="멤버십">
          <div className={`${ROW_CLASS} justify-between active:opacity-100`}>
            {isPremium ? "프리미엄 적용중" : "베이직 이용중"}
            <Link href="/my/plan" className="rounded-full bg-ink px-2.5 py-0.5 text-caption font-bold text-white active:opacity-80">
              {isPremium ? "구독 관리" : "프리미엄 보기"}
            </Link>
          </div>
        </Section>

        <Section title="일반">
          <Link href="/my/settings/account" className={ROW_CLASS}>
            로그인 정보
          </Link>
          {/* 유통기한 임박 알림 · 푸시 알림은 4단계 */}
          <SoonButton notice="알림 설정은 곧 만들어요." className={ROW_CLASS}>
            알림
          </SoonButton>
        </Section>

        <Section title="정보" className="mt-9">
          {/* 약관의 글은 남에게 공개하기 전(2단계)에 준비한다 — docs/roadmap.md "나중에 할 일" */}
          <SoonButton notice="이용약관은 준비 중이에요." className={ROW_CLASS}>
            이용약관
          </SoonButton>
          <SoonButton notice="개인정보처리방침은 준비 중이에요." className={ROW_CLASS}>
            개인정보처리방침
          </SoonButton>
          <Link href="/my/settings/licenses" className={ROW_CLASS}>
            오픈소스 라이선스
          </Link>
        </Section>

        <form action={signOut} className="mt-2">
          <button type="submit" className={`${ROW_CLASS} text-primary`}>
            로그아웃
          </button>
        </form>
        {/* 배포한 날짜. next.config.ts 가 빌드할 때 찍는다 */}
        <p className="flex h-12 items-center text-body">버전 {formatShortDate(process.env.NEXT_PUBLIC_BUILD_DATE ?? "")}</p>
      </div>
    </main>
  );
}

function Section({ title, className = "", children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={`mt-4 flex flex-col ${className}`}>
      <h2 className="flex h-10 items-center text-link font-bold">{title}</h2>
      {children}
    </section>
  );
}
