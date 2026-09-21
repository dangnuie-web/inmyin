import { useId, type ComponentProps, type ReactNode } from "react";

type DarkInputProps = ComponentProps<"input"> & {
  label: string;
  // 입력칸 안 오른쪽에 놓을 것 (드롭다운 화살표 등)
  trailing?: ReactNode;
  // 입력칸 바로 아래에 겹쳐 띄울 것 (드롭다운 목록)
  dropdown?: ReactNode;
};

// 어두운 화면(M-08 정보 입력) 위의 입력칸. 밝은 화면에서는 Input 을 쓴다.
export function DarkInput({ label, trailing, dropdown, id, className = "", ...props }: DarkInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-label font-bold text-white">
        {label}
      </label>
      <div className="relative">
        <div className="flex h-12.5 items-center gap-2 rounded-md bg-field-dark pl-4 pr-3">
          {/* 글자는 피그마(15px)보다 1px 큰 16px — 아이폰은 16px 보다 작은 입력칸을 누르면 화면을 멋대로 확대한다 */}
          <input
            id={inputId}
            className={`min-w-0 flex-1 bg-transparent text-body text-white outline-none placeholder:text-caption placeholder:text-placeholder-dark ${className}`}
            {...props}
          />
          {trailing}
        </div>
        {dropdown}
      </div>
    </div>
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
