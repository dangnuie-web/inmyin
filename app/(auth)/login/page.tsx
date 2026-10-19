import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { FormError } from "@/components/ui/FormError";
import { NEXT_PARAM, safeNext } from "@/lib/auth/paths";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = { title: "로그인 · INMYIN" };

// A-01 · 로그인. ?next= 가 있으면 로그인한 뒤 그 화면으로 돌아간다 (구경하다 하트 · 팔로우 · 댓글을 눌러 온 경우)
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next: rawNext } = await searchParams;
  const next = safeNext(rawNext);

  return (
    <div className="flex flex-1 flex-col">
      <div className="my-auto flex flex-col gap-12 pb-24">
        <h1 className="flex justify-center">
          <Image src="/logo.svg" alt="INMYIN" width={146} height={31} priority />
        </h1>

        <div className="flex flex-col gap-3">
          <SocialButtons next={next} />
          {error === "oauth" && (
            <FormError message="구글·카카오 로그인에 실패했습니다. 다시 시도해 주세요." />
          )}
        </div>

        <nav className="flex items-center justify-center gap-7 pt-4 text-link font-semibold text-ink-muted">
          <Link href="/signup">이메일 가입</Link>
          <span aria-hidden className="h-5 w-px bg-ink-muted" />
          <Link href={next ? `/login/email?${NEXT_PARAM}=${encodeURIComponent(next)}` : "/login/email"}>이메일 로그인</Link>
        </nav>
      </div>

      <footer className="flex flex-col items-center gap-1 text-caption text-ink-muted">
        <p className="flex gap-4">
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy" className="text-ink">
            개인정보처리방침
          </Link>
        </p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </footer>
    </div>
  );
}
