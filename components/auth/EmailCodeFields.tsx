"use client";

import { useEffect, useState, useTransition } from "react";
import { verifyEmailCode } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Input } from "@/components/ui/Input";
import { isEmail, isOtp, OTP_RESEND_SECONDS, OTP_SECONDS, type FormState } from "@/lib/auth/rules";

// 전송 버튼과 확인 버튼의 폭을 맞춰서 이메일 칸과 인증번호 칸이 같은 너비가 되게 한다
const ACTION_WIDTH = "w-28";

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// 이메일 인증번호의 상태(보냈는지, 남은 시간, 확인됐는지)를 들고 있는다.
// 가입(A-02)과 비밀번호 재설정(A-04)이 같이 쓴다. send 는 메일을 보내는 서버 함수.
export function useEmailCode(send: (email: string) => Promise<FormState>) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  // 인증번호를 보낸 시각. null 이면 아직 안 보낸 것
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string>();
  const [sending, startSending] = useTransition();
  const [verifying, startVerifying] = useTransition();

  // 인증번호를 보낸 뒤로 1초마다 시계를 갱신한다. 확인이 끝나면 멈춘다
  useEffect(() => {
    if (sentAt === null || verified) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentAt, verified]);

  const elapsed = sentAt === null ? 0 : Math.floor((now - sentAt) / 1000);
  const secondsLeft = Math.max(0, OTP_SECONDS - elapsed);
  const resendLeft = Math.max(0, OTP_RESEND_SECONDS - elapsed);
  const sent = sentAt !== null;
  const expired = sent && !verified && secondsLeft === 0;

  function changeEmail(value: string) {
    setEmail(value);
    // 주소를 고치면 앞서 보낸 인증번호는 쓸 수 없다. 보내기 전 상태로 되돌린다
    setSentAt(null);
    setError(undefined);
  }

  function sendCode() {
    setError(undefined);
    startSending(async () => {
      const result = await send(email);
      if (result.error) {
        setError(result.error);
        return;
      }
      const time = Date.now();
      setSentAt(time);
      setNow(time);
      setCode("");
    });
  }

  function verifyCode() {
    setError(undefined);
    startVerifying(async () => {
      const result = await verifyEmailCode(email, code);
      if (result.error) setError(result.error);
      else setVerified(true);
    });
  }

  return {
    email,
    code,
    setCode,
    changeEmail,
    sendCode,
    verifyCode,
    sending,
    verifying,
    error,
    sent,
    expired,
    verified,
    secondsLeft,
    resendLeft,
  };
}

type EmailCodeFieldsProps = {
  state: ReturnType<typeof useEmailCode>;
  // 이메일을 고쳤을 때 폼이 따로 되돌릴 것이 있으면 여기서 한다
  onEmailChange?: () => void;
};

// 이메일 + 인증번호 전송 버튼 + (보낸 뒤에 나타나는) 인증번호 칸과 확인 버튼.
// 확인이 끝나면 두 칸을 잠근다. readOnly 로 잠가야 폼을 보낼 때 이메일이 같이 간다 (disabled 는 빠진다)
export function EmailCodeFields({ state, onEmailChange }: EmailCodeFieldsProps) {
  const { email, code, sent, expired, verified, sending, verifying, resendLeft } = state;

  let sendLabel = "인증번호 전송";
  if (sending) sendLabel = "보내는 중…";
  else if (sent) sendLabel = resendLeft > 0 && !verified ? `재전송 ${resendLeft}초` : "재전송";

  return (
    <div className="flex flex-col gap-3">
      <Input
        name="email"
        type="email"
        label="이메일"
        placeholder="이메일을 입력해주세요."
        autoComplete="email"
        required
        readOnly={verified}
        value={email}
        onChange={(e) => {
          state.changeEmail(e.target.value);
          onEmailChange?.();
        }}
        action={
          <Button
            variant="point"
            size="sm"
            className={ACTION_WIDTH}
            onClick={state.sendCode}
            disabled={!isEmail(email.trim()) || sending || verified || (sent && resendLeft > 0)}
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
          placeholder="인증번호 입력"
          readOnly={verified}
          value={code}
          onChange={(e) => state.setCode(e.target.value.replace(/\D/g, ""))}
          trailing={
            !verified && (
              <span className="text-body text-primary">{formatTime(state.secondsLeft)}</span>
            )
          }
          action={
            <Button
              variant="point"
              size="sm"
              className={ACTION_WIDTH}
              onClick={state.verifyCode}
              disabled={!isOtp(code) || expired || verifying || verified}
            >
              {verifying ? "확인 중…" : "확인"}
            </Button>
          }
        />
      )}
      {verified ? (
        <p role="status" className="text-caption text-point">
          인증번호가 확인되었습니다.
        </p>
      ) : (
        <FormError
          message={
            state.error ?? (expired ? "시간이 지났습니다. 인증번호를 다시 받아주세요." : undefined)
          }
        />
      )}
    </div>
  );
}
