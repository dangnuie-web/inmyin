import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

type CategoryTagProps = {
  label: string;
  // 고른 것. 거르는 칩(href · onClick)은 글자만 — 고름 = 검정 굵게, 기본 = 회색(ink-muted). 버튼이 아니라 상태라서 상자를 뺐다
  // (무늬 흑백버튼설계 v01 3-5, Home 갈래 · 정렬 글자와 같은 문법). 편집 태그(onRemove) · 그냥 표시(span)는 상자 그대로 — 회색 바탕
  selected?: boolean;
  // 필터처럼 눌러서 고르는 곳에서 준다. 주소로 고르면 href, 화면 안에서 고르면 onClick
  href?: string;
  onClick?: () => void;
  // 편집 화면에서 준다. × 가 붙는다
  onRemove?: () => void;
  // sm 은 정보 입력 화면용. 태그가 여러 줄로 쌓이는 곳이라 한 줄에 4~5개가 들어가게 작다
  size?: keyof typeof SIZES;
};

const SIZES = {
  md: { base: "gap-1.5 py-1 text-label", plain: "px-6", removable: "pl-6 pr-3", remove: "px-1", x: 0.625 },
  sm: { base: "gap-0.5 py-0.5 text-caption", plain: "px-3", removable: "pl-3 pr-1", remove: "px-1.5", x: 0.5 },
};

export function CategoryTag({ label, selected = true, href, onClick, onRemove, size = "md" }: CategoryTagProps) {
  const sizes = SIZES[size];
  const base = `flex shrink-0 items-center justify-center whitespace-nowrap ${sizes.base}`;
  const boxClass = `${base} rounded-md border border-border font-semibold ${selected ? "bg-gray-2 text-ink" : "bg-white text-ink-muted"} ${
    onRemove ? sizes.removable : sizes.plain
  }`;
  const textClass = `${base} ${selected ? "font-bold text-ink" : "font-medium text-ink-muted"}`;
  const className = href || onClick ? textClass : boxClass;

  if (onRemove) {
    return (
      <span className={className}>
        {label}
        <button type="button" onClick={onRemove} aria-label={`${label} 지우기`} className={`${sizes.remove} text-ink-muted active:opacity-60`}>
          <Icon name="close24" scale={sizes.x} />
        </button>
      </span>
    );
  }
  if (href) {
    return (
      // 고르는 동안 화면이 맨 위로 튀지 않게, 뒤로가기 기록도 쌓이지 않게 한다
      <Link href={href} replace scroll={false} aria-current={selected ? "true" : undefined} className={className}>
        {label}
      </Link>
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
