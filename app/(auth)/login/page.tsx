import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { FormError } from "@/components/ui/FormError";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = { title: "로그인 · INMYIN" };

// A-01 · 로그인
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col">
      <div className="my-auto flex flex-col gap-12 pb-24">
        <h1 className="flex justify-center">
          <Image src="/logo.svg" alt="INMYIN" width={146} height={31} priority />
        </h1>

        <div className="flex flex-col gap-3">
          <SocialButtons />
          {error === "oauth" && (
            <FormError message="구글·카카오 로그인에 실패했습니다. 다시 시도해 주세요." />
          )}
        </div>

        <nav className="flex items-center justify-center gap-7 pt-4 text-link font-semibold text-ink-muted">
          <Link href="/signup">이메일 가입</Link>
          <span aria-hidden className="h-5 w-px bg-ink-muted" />
          <Link href="/login/email">이메일 로그인</Link>
        </nav>
      </div>

      <footer className="flex flex-col items-center gap-1 text-caption text-ink-muted">
        {/* 약관 본문 페이지를 만들면 링크로 바꾼다 */}
        <p className="flex gap-4">
          <span>이용약관</span>
          <span className="text-ink">개인정보 취급방침</span>
        </p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </footer>
    </div>
  );
}
