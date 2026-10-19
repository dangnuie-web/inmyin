"use client";

import Link from "next/link";
import { signInWithEmail } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useFormSubmit } from "./useFormSubmit";

// next = 로그인한 뒤 돌아올 주소 (구경하다 하트 · 팔로우를 눌러 온 경우)
export function LoginForm({ next }: { next?: string | null }) {
  const { state, pending, onSubmit } = useFormSubmit(signInWithEmail);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Input
        name="email"
        type="email"
        label="이메일"
        placeholder="이메일을 입력해주세요."
        autoComplete="email"
      />
      <PasswordInput
        name="password"
        label="비밀번호"
        placeholder="비밀번호를 입력해주세요."
        autoComplete="current-password"
      />
      <Link href="/reset-password" className="self-start text-label text-ink-muted">
        비밀번호를 잊으셨나요?
      </Link>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
