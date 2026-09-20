"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import type { FormState } from "@/lib/auth/rules";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

// 서버 함수에 폼을 보내고 결과(오류 문구)를 돌려받는다.
// <form action={...}> 을 그대로 쓰면 오류가 났을 때 입력한 값이 전부 지워져서, 직접 보내는 방식을 쓴다.
export function useFormSubmit(action: Action) {
  const [state, dispatch, pending] = useActionState(action, {});

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return { state, pending, onSubmit };
}
