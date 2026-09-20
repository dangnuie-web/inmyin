"use client";

import { signInWithEmail } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useFormSubmit } from "./useFormSubmit";

export function LoginForm() {
  const { state, pending, onSubmit } = useFormSubmit(signInWithEmail);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
      <FormError message={state.error} />
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
