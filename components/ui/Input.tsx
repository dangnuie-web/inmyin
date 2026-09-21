import { useId, type ComponentProps, type ReactNode } from "react";

type InputProps = ComponentProps<"input"> & {
  label?: string;
  // 입력칸 아래 회색 도움말
  hint?: string;
  // 입력칸 안 오른쪽에 놓을 것 (남은 시간, 비밀번호 보기 버튼 등)
  trailing?: ReactNode;
  // 입력칸 밖 오른쪽에 놓을 것 (인증번호 전송 버튼 등)
  action?: ReactNode;
};

export function Input({ label, hint, trailing, action, id, required, className = "", ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-body font-semibold">
          {label}
          {required && <span aria-hidden>*</span>}
        </label>
      )}
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            required={required}
            className={`h-12 w-full rounded-md border border-disabled bg-white px-4 text-body outline-none placeholder:text-disabled focus:border-ink read-only:bg-surface read-only:text-ink-muted disabled:bg-surface disabled:text-ink-muted ${trailing ? "pr-14" : ""} ${className}`}
            {...props}
          />
          {trailing && (
            <div className="absolute inset-y-0 right-4 flex items-center">{trailing}</div>
          )}
        </div>
        {action}
      </div>
      {hint && <p className="text-caption text-ink-muted">{hint}</p>}
    </div>
  );
}
