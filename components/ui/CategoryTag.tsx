type CategoryTagProps = {
  label: string;
  // 피그마 `카테고리 태그`의 변형. 선택됨 = 회색 바탕 + 검은 글자, 기본 = 흰 바탕 + 회색 글자
  selected?: boolean;
  // 필터처럼 눌러서 고르는 곳에서 준다
  onClick?: () => void;
  // 편집 화면에서 준다. × 가 붙는다
  onRemove?: () => void;
};

export function CategoryTag({ label, selected = true, onClick, onRemove }: CategoryTagProps) {
  const className = `flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border py-1 text-label font-semibold ${
    selected ? "bg-gray-2 text-ink" : "bg-white text-disabled"
  } ${onRemove ? "pl-6 pr-3" : "px-6"}`;

  if (onRemove) {
    return (
      <span className={className}>
        {label}
        <button type="button" onClick={onRemove} aria-label={`${label} 지우기`} className="px-1 text-ink-muted active:opacity-60">
          ×
        </button>
      </span>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={className}>
        {label}
      </button>
    );
  }
  return <span className={className}>{label}</span>;
}
