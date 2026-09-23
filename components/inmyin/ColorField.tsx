"use client";


// 자주 쓰는 색 몇 개만 — 주인 의견: 추천 색이 많으면 어지럽다. 나머지는 직접 고른다
const QUICK = ["#ffffff", "#000000", "#ffe4ec", "#fff3b0", "#d4f1f4", "#e8dcff"] as const;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (color: string) => void;
};

// 색 고르기 한 줄 — [지금 색(누르면 브라우저의 색상 선택기 — 아이폰은 스펙트럼 · 슬라이더 · 스포이드)] [헥스 코드 칸] [자주 쓰는 색 6개].
// 배경 · 글자 어디서나 이 부품을 쓴다. 주인이 레이아웃을 그려 주면 그것에 맞춘다
export function ColorField({ label, value, onChange }: ColorFieldProps) {
  // 칸에 친 글자가 색이 아니면 되돌린다. 밖에서 색이 바뀌면(견본 · 선택기) 칸은 key 로 새로 만들어져 따라간다
  function commitHex(input: HTMLInputElement) {
    const text = input.value.trim();
    const normalized = text.startsWith("#") ? text : `#${text}`;
    if (HEX_PATTERN.test(normalized)) onChange(normalized.toLowerCase());
    else input.value = value;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-semibold text-ink-muted">{label}</p>
      <div className="flex items-center gap-2">
        <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-border" style={{ backgroundColor: value }}>
          <span className="sr-only">{label} 직접 고르기</span>
          <input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
        </label>
        <input
          key={value}
          defaultValue={value}
          onBlur={(event) => commitHex(event.target)}
          onKeyDown={(event) => event.key === "Enter" && commitHex(event.currentTarget)}
          maxLength={7}
          spellCheck={false}
          autoCapitalize="off"
          aria-label={`${label} 헥스 코드`}
          className="h-9 w-24 rounded-md border border-disabled bg-white px-3 font-mono text-label uppercase outline-none focus:border-ink"
        />
        <ul className="ml-auto flex gap-1.5">
          {QUICK.map((color) => (
            <li key={color}>
              <button
                type="button"
                onClick={() => onChange(color)}
                aria-label={color}
                aria-pressed={color === value}
                className={`size-7 rounded-full border ${color === value ? "border-2 border-ink" : color === "#ffffff" ? "border-border" : "border-transparent"}`}
                style={{ backgroundColor: color }}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
