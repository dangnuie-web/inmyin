"use client";

import { useState } from "react";
import { sendSignupCode, signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PASSWORD_MIN } from "@/lib/auth/rules";
import { EmailCodeFields, useEmailCode } from "./EmailCodeFields";
import { TermsAgreement } from "./TermsAgreement";
import { useFormSubmit } from "./useFormSubmit";

export function SignupForm() {
  const { state, pending, onSubmit } = useFormSubmit(signUp);
  const emailCode = useEmailCode(sendSignupCode);

  const [password, setPassword] = useState("");
  const [termsDone, setTermsDone] = useState(false);

  // 인증번호를 보내기 전에는 인증번호 칸과 약관이 보이지 않는다 (가입1 → 가입2 프레임)
  const { sent, verified } = emailCode;
  const canSubmit = verified && password.length >= PASSWORD_MIN && termsDone && !pending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        {/* 이메일을 고치면 약관 칸이 사라졌다 새로 그려지므로 동의 여부도 되돌린다 */}
        <EmailCodeFields state={emailCode} onEmailChange={() => setTermsDone(false)} />

        <PasswordInput
          name="password"
          label="비밀번호"
          placeholder="비밀번호를 입력해주세요."
          autoComplete="new-password"
          hint={`${PASSWORD_MIN}자 이상`}
          required
          minLength={PASSWORD_MIN}
          // 인증번호를 확인한 뒤에 입력한다
          disabled={!verified}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {sent && <TermsAgreement onChange={setTermsDone} />}

      <div className="flex flex-col gap-3">
        <FormError message={state.error} />
        <Button type="submit" disabled={!canSubmit}>
          {pending ? "가입하는 중…" : "가입하기"}
        </Button>
      </div>
    </form>
  );
}
