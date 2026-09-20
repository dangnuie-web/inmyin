import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "회원가입 · INMYIN" };

// A-02 · 가입
export default function SignupPage() {
  return (
    <div className="flex flex-col gap-12">
      <h1 className="text-center text-title font-bold">회원가입</h1>
      <SignupForm />
      <p className="text-center text-label text-ink-muted">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
          로그인
        </Link>
      </p>
    </div>
  );
}
