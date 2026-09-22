import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

const LABELS = { back: "뒤로", close: "닫기", settings: "설정" };

type HeaderMiniProps = {
  // 왼쪽 아이콘. 피그마 `이동` 컴포넌트의 변형과 같다. 설정(톱니)은 내 프로필(M-01)에서 쓴다
  icon: keyof typeof LABELS;
  // 아이콘을 누르면 갈 곳. 정해진 주소가 아니라 "왔던 곳으로" 돌아가야 하면 onClick 을 준다
  href?: string;
  onClick?: () => void;
  title: string;
  // 어두운 화면 위에서는 dark
  tone?: "light" | "dark";
  // 오른쪽 끝에 놓을 것 (M-04 의 짐싸기 버튼 등)
  action?: ReactNode;
  // 화면에 따라 덧붙일 것
  className?: string;
};

// 피그마 `헤더미니`. 아이콘 + 제목 한 줄
export function HeaderMini({ icon, href, onClick, title, tone = "light", action, className = "" }: HeaderMiniProps) {
  return (
    // 뒤로 화살표는 64px 아이콘 칸의 25px 지점에 그려져 있다. 보이는 끝이 화면 여백 20px 선에 오도록 칸을 5px 왼쪽으로 민다
    <header className={`-ml-1.25 flex items-center gap-2 ${tone === "dark" ? "text-white" : "text-ink"} ${className}`}>
      {href ? (
        <Link href={href} aria-label={LABELS[icon]} className="active:opacity-60">
          <Icon name={icon} />
        </Link>
      ) : (
        <button type="button" onClick={onClick} aria-label={LABELS[icon]} className="active:opacity-60">
          <Icon name={icon} />
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-link font-bold">{title}</h1>
      {action && <div className="pr-5">{action}</div>}
    </header>
  );
}
