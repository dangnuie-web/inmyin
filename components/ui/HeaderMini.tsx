import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

const LABELS = { back: "뒤로", close: "닫기" };

type HeaderMiniProps = {
  // 왼쪽 아이콘. 피그마 `이동` 컴포넌트의 변형과 같다 (설정은 M-01 을 만들 때 더한다)
  icon: keyof typeof LABELS;
  // 아이콘을 누르면 갈 곳. 정해진 주소가 아니라 "왔던 곳으로" 돌아가야 하면 onClick 을 준다
  href?: string;
  onClick?: () => void;
  title: string;
  // 어두운 화면 위에서는 dark
  tone?: "light" | "dark";
  // 오른쪽 끝에 놓을 것 (M-04 의 짐싸기 버튼 등)
  action?: ReactNode;
};

// 피그마 `헤더미니`. 아이콘 + 제목 한 줄
export function HeaderMini({ icon, href, onClick, title, tone = "light", action }: HeaderMiniProps) {
  return (
    <header className={`flex items-center gap-2 ${tone === "dark" ? "text-white" : "text-ink"}`}>
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
      {action && <div className="pr-6.25">{action}</div>}
    </header>
  );
}
