"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Input } from "@/components/ui/Input";
import { isEmail, isOtp, OTP_RESEND_SECONDS, OTP_SECONDS, type FormState } from "@/lib/auth/rules";

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

// 이메일 인증번호의 상태(보냈는지, 남은 시간, 입력한 번호)를 들고 있는다.
// 가입(A-02)과 비밀번호 재설정(A-04)이 같이 쓴다. send 는 메일을 보내는 서버 함수.
export function useEmailCode(send: (email: string) => Promise<FormState>) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  // 인증번호를 보낸 시각. null 이면 아직 안 보낸 것
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

  function changeEmail(value: string) {
    setEmail(value);
    // 주소를 고치면 앞서 보낸 인증번호는 쓸 수 없다. 보내기 전 상태로 되돌린다
    setSentAt(null);
    setSendError(undefined);
  }

  function sendCode() {
    setSendError(undefined);
    startSending(async () => {
      const result = await send(email);
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

  return {
    email,
    code,
    setCode,
    changeEmail,
    sendCode,
    sending,
    sendError,
    sent,
    expired,
    secondsLeft,
    resendLeft,
    // 시간 안에 인증번호를 형식에 맞게 입력했는지
    ready: sent && !expired && isOtp(code),
  };
}

type EmailCodeFieldsProps = {
  state: ReturnType<typeof useEmailCode>;
  // 이메일을 고쳤을 때 폼이 따로 되돌릴 것이 있으면 여기서 한다
  onEmailChange?: () => void;
};

// 이메일 + 인증번호 전송 버튼 + (보낸 뒤에 나타나는) 인증번호 칸
export function EmailCodeFields({ state, onEmailChange }: EmailCodeFieldsProps) {
  const { email, code, sent, expired, sending, resendLeft } = state;

  let sendLabel = "인증번호 전송";
  if (sending) sendLabel = "보내는 중…";
  else if (sent) sendLabel = resendLeft > 0 ? `재전송 ${resendLeft}초` : "재전송";

  return (
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
          state.changeEmail(e.target.value);
          onEmailChange?.();
        }}
        action={
          <Button
            variant="point"
            size="sm"
            onClick={state.sendCode}
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
          onChange={(e) => state.setCode(e.target.value.replace(/\D/g, ""))}
          trailing={<span className="text-body text-primary">{formatTime(state.secondsLeft)}</span>}
        />
      )}
      <FormError
        message={
          state.sendError ?? (expired ? "시간이 지났습니다. 인증번호를 다시 받아주세요." : undefined)
        }
      />
    </div>
  );
}
