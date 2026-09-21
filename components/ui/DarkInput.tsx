import { useId, type ComponentProps, type ReactNode } from "react";

// 어두운 화면(M-08 정보 입력) 위의 입력칸들. 밝은 화면에서는 Input 을 쓴다.

type FieldProps = {
  label: string;
  htmlFor: string;
  // stacked = 이름표가 위, inline = 이름표가 왼쪽 (개수 · 획득날짜 · 유통기한)
  layout?: "stacked" | "inline";
  children: ReactNode;
};

// 이름표 + 입력칸 자리. 입력칸의 생김새는 children 이 정한다
function DarkField({ label, htmlFor, layout = "stacked", children }: FieldProps) {
  return (
    <div className={layout === "inline" ? "flex items-center" : "flex flex-col gap-2"}>
      <label htmlFor={htmlFor} className={`text-label font-bold text-white ${layout === "inline" ? "w-21.5 shrink-0" : ""}`}>
        {label}
      </label>
      <div className="relative min-w-0 flex-1">{children}</div>
    </div>
  );
}

// 글자는 피그마(15px)보다 1px 큰 16px — 아이폰은 16px 보다 작은 입력칸을 누르면 화면을 멋대로 확대한다
const TEXT_CLASS = "text-body text-white outline-none placeholder:text-caption placeholder:text-placeholder-dark";

type DarkInputProps = ComponentProps<"input"> & {
  label: string;
  layout?: "stacked" | "inline";
  // 입력칸 안 오른쪽에 놓을 것 (드롭다운 화살표 등)
  trailing?: ReactNode;
  // 입력칸 바로 아래에 겹쳐 띄울 것 (드롭다운 목록)
  dropdown?: ReactNode;
};

export function DarkInput({ label, layout, trailing, dropdown, id, className = "", ...props }: DarkInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <DarkField label={label} htmlFor={inputId} layout={layout}>
      <div className="flex h-12.5 items-center gap-2 rounded-md bg-field-dark pl-4 pr-3">
        <input id={inputId} className={`min-w-0 flex-1 bg-transparent ${TEXT_CLASS} ${className}`} {...props} />
        {trailing}
      </div>
      {dropdown}
    </DarkField>
  );
}

type DarkTextareaProps = ComponentProps<"textarea"> & { label: string };

export function DarkTextarea({ label, id, className = "", ...props }: DarkTextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;

  return (
    <DarkField label={label} htmlFor={textareaId}>
      <textarea
        id={textareaId}
        className={`block h-35 w-full resize-none rounded-md bg-field-dark p-4 ${TEXT_CLASS} ${className}`}
        {...props}
      />
    </DarkField>
  );
}

// DarkInput 아래에 뜨는 목록의 틀
export function DarkDropdown({ children }: { children: ReactNode }) {
  return (
    <ul
      role="listbox"
      className="absolute inset-x-0 top-full z-10 mt-1 flex flex-col rounded-md bg-field-dark py-2 text-caption text-white shadow-lg"
    >
      {children}
    </ul>
  );
}

export function DarkDropdownOption({ children, onSelect }: { children: ReactNode; onSelect: () => void }) {
  return (
    <li role="option" aria-selected={false}>
      <button type="button" onClick={onSelect} className="w-full px-4 py-2 text-left active:opacity-60">
        {children}
      </button>
    </li>
  );
}
