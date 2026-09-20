"use client";

import { useEffect, useState, useTransition } from "react";
import { sendSignupCode, signUpWithCode } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { isEmail, isOtp, OTP_RESEND_SECONDS, OTP_SECONDS, PASSWORD_MIN } from "@/lib/auth/rules";
import { TermsAgreement } from "./TermsAgreement";
import { useFormSubmit } from "./useFormSubmit";

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function SignupForm() {
  const { state, pending, onSubmit } = useFormSubmit(signUpWithCode);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [termsDone, setTermsDone] = useState(false);

  // 인증번호를 보낸 시각. null 이면 아직 안 보낸 것 (가입1 프레임)
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [sendError, setSendError] = useState<string>();
  const [sending, startSending] = useTransition();

  // 인증번호를 보낸 뒤로 1초마다 시계를 갱신한다
  useEffect(() => {
    if (sentAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentAt]);

  const elapsed = sentAt === null ? 0 : Math.floor((now - sentAt) / 1000);
  const secondsLeft = Math.max(0, OTP_SECONDS - elapsed);
  const resendLeft = Math.max(0, OTP_RESEND_SECONDS - elapsed);
  const sent = sentAt !== null;
  const expired = sent && secondsLeft === 0;

  function sendCode() {
    setSendError(undefined);
    startSending(async () => {
      const result = await sendSignupCode(email);
      if (result.error) {
        setSendError(result.error);
        return;
      }
      const time = Date.now();
      setSentAt(time);
      setNow(time);
      setCode("");
    });
  }

  let sendLabel = "인증번호 전송";
  if (sending) sendLabel = "보내는 중…";
  else if (sent) sendLabel = resendLeft > 0 ? `재전송 ${resendLeft}초` : "재전송";

  const canSubmit =
    sent && !expired && isOtp(code) && password.length >= PASSWORD_MIN && termsDone && !pending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Input
          name="email"
          type="email"
          label="이메일"
          placeholder="이메일을 입력해주세요."
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            // 주소를 고치면 앞서 보낸 인증번호는 쓸 수 없다. 가입1 프레임으로 되돌린다
            setSentAt(null);
            setTermsDone(false);
          }}
          action={
            <Button
              variant="point"
              size="sm"
              onClick={sendCode}
              disabled={!isEmail(email.trim()) || sending || (sent && resendLeft > 0)}
            >
              {sendLabel}
            </Button>
          }
        />
        {sent && (
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="인증번호"
            placeholder="메일로 받은 인증번호를 입력해주세요."
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            trailing={<span className="text-body text-primary">{formatTime(secondsLeft)}</span>}
          />
        )}
        <FormError
          message={sendError ?? (expired ? "시간이 지났습니다. 인증번호를 다시 받아주세요." : undefined)}
        />
      </div>

      <PasswordInput
        name="password"
        label="비밀번호"
        placeholder="비밀번호를 입력해주세요."
        autoComplete="new-password"
        hint={`${PASSWORD_MIN}자 이상`}
        required
        minLength={PASSWORD_MIN}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {sent && <TermsAgreement onChange={setTermsDone} />}

      <div className="flex flex-col gap-3">
        <FormError message={state.error} />
        <Button type="submit" disabled={!canSubmit}>
          {pending ? "가입하는 중…" : sent ? "인증하고 가입하기" : "가입하기"}
        </Button>
      </div>
    </form>
  );
}
