"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "./Input";

// 눈 아이콘으로 비밀번호를 보였다 숨겼다 할 수 있는 입력칸
export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
          aria-pressed={visible}
          className="text-ink-muted"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {!visible && <path d="m4 4 16 16" />}
          </svg>
        </button>
      }
    />
  );
}
