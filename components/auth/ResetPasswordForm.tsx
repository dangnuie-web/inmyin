"use client";

import { useState } from "react";
import { resetPassword, sendResetCode } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PASSWORD_MIN } from "@/lib/auth/rules";
import { EmailCodeFields, useEmailCode } from "./EmailCodeFields";
import { useFormSubmit } from "./useFormSubmit";

export function ResetPasswordForm() {
  const { state, pending, onSubmit } = useFormSubmit(resetPassword);
  const emailCode = useEmailCode(sendResetCode);

  const [password, setPassword] = useState("");

  const { verified } = emailCode;
  const canSubmit = verified && password.length >= PASSWORD_MIN && !pending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <EmailCodeFields state={emailCode} />

        <PasswordInput
          name="password"
          label="새 비밀번호"
          placeholder="새 비밀번호를 입력해주세요."
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

      <div className="flex flex-col gap-3">
        <FormError message={state.error} />
        <Button type="submit" disabled={!canSubmit}>
          {pending ? "변경하는 중…" : "비밀번호 변경하기"}
        </Button>
      </div>
    </form>
  );
}
