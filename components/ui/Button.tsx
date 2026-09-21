import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-ink text-white",
  point: "bg-point text-white",
  outline: "border border-disabled bg-white text-ink",
  kakao: "bg-kakao text-ink",
  // 검은 화면 위의 버튼 (M-07 저장하기)
  dark: "bg-surface-dark text-white",
};

const SIZES = {
  // 화면 아래의 큰 버튼
  lg: "h-14 w-full rounded-md text-body font-semibold",
  // 입력칸 옆에 붙는 작은 버튼
  sm: "h-10 shrink-0 rounded-sm px-4 text-label font-semibold",
  // 어두운 화면 아래의 알약 모양 버튼 (M-08 저장하기)
  pill: "h-11.5 w-40.25 rounded-full text-title font-bold",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({
  variant = "primary",
  size = "lg",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`flex items-center justify-center gap-2 whitespace-nowrap transition-opacity active:opacity-80 disabled:border-transparent disabled:bg-disabled disabled:text-white ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
