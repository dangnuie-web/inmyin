type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  // 화면 읽어주기가 읽을 이름. 예: "공개"
  label: string;
};

// 피그마 `토글`. 63 × 33 알약에 지름 22 손잡이 — 켜지면 보라색(point), 꺼지면 회색
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8.25 w-15.75 shrink-0 rounded-full transition-colors ${checked ? "bg-point" : "bg-gray-mid"}`}
    >
      <span
        className={`absolute left-2 top-1/2 size-5.5 -translate-y-1/2 rounded-full bg-white transition-transform ${
          checked ? "translate-x-6.25" : ""
        }`}
      />
    </button>
  );
}
