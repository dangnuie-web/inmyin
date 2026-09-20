"use client";

import { useState } from "react";
import { createProfile } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { Input } from "@/components/ui/Input";
import { HANDLE_PATTERN, NICKNAME_MAX } from "@/lib/auth/rules";
import { TermsAgreement } from "./TermsAgreement";
import { useFormSubmit } from "./useFormSubmit";

type OnboardingFormProps = {
  // 구글·카카오에서 받아온 이름
  defaultNickname: string;
  // 아직 약관에 동의한 적 없는 사람(구글·카카오 가입)이면 true
  needsTerms: boolean;
};

export function OnboardingForm({ defaultNickname, needsTerms }: OnboardingFormProps) {
  const { state, pending, onSubmit } = useFormSubmit(createProfile);
  const [nickname, setNickname] = useState(defaultNickname);
  const [handle, setHandle] = useState("");
  const [termsDone, setTermsDone] = useState(!needsTerms);

  const canSubmit = nickname.trim() !== "" && HANDLE_PATTERN.test(handle) && termsDone && !pending;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <Input
          name="nickname"
          label="닉네임"
          placeholder="닉네임을 입력해주세요."
          autoComplete="nickname"
          required
          maxLength={NICKNAME_MAX}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <Input
          name="handle"
          label="아이디"
          placeholder="아이디를 입력해주세요."
          hint="영소문자·숫자·밑줄(_) 3~30자. 내 프로필 주소(/u/아이디)가 됩니다."
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          maxLength={30}
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase())}
        />
      </div>

      {needsTerms && <TermsAgreement onChange={setTermsDone} />}

      <div className="flex flex-col gap-3">
        <FormError message={state.error} />
        <Button type="submit" disabled={!canSubmit}>
          {pending ? "등록하는 중…" : "등록하기"}
        </Button>
      </div>
    </form>
  );
}
