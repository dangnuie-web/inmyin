import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "이메일 로그인 · INMYIN" };

// A-01a · 이메일 로그인
export default function EmailLoginPage() {
  return (
    <div className="flex flex-col gap-12">
      <h1 className="text-center text-title font-bold">이메일 로그인</h1>
      <LoginForm />
      <nav className="flex items-center justify-center gap-5 text-label font-semibold text-ink-muted">
        <Link href="/signup">이메일 가입</Link>
        <span aria-hidden className="h-4 w-px bg-ink-muted" />
        <Link href="/login">다른 방법으로 로그인</Link>
      </nav>
    </div>
  );
}
