import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = { title: "비밀번호 재설정 · INMYIN" };

// A-04 · 비밀번호 재설정
export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-title font-bold">비밀번호 재설정</h1>
        <p className="text-label text-ink-muted">
          가입한 이메일을 입력하면 본인인증 후
          <br />
          비밀번호를 재설정할 수 있습니다.
        </p>
      </div>
      <ResetPasswordForm />
      {/* 가입한 이메일이 기억나지 않는 사람을 위한 안내 */}
      <div className="flex flex-col items-center gap-3 text-center text-caption text-ink-muted">
        <p>
          구글·카카오로 가입하셨다면{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
            로그인 화면
          </Link>
          에서 해당 버튼을 눌러주세요.
        </p>
        <p>
          가입한 이메일을 찾을 수 없다면{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-ink underline underline-offset-4"
          >
            문의 메일
          </a>
          을 보내주세요.
        </p>
      </div>
    </div>
  );
}
