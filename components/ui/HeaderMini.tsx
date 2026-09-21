import Link from "next/link";
import { Icon } from "./Icon";

const LABELS = { back: "뒤로", close: "닫기" };

type HeaderMiniProps = {
  // 왼쪽 아이콘. 피그마 `이동` 컴포넌트의 변형과 같다 (설정은 M-01 을 만들 때 더한다)
  icon: keyof typeof LABELS;
  // 아이콘을 누르면 갈 곳
  href: string;
  title: string;
  // 어두운 화면 위에서는 dark
  tone?: "light" | "dark";
};

// 피그마 `헤더미니`. 아이콘 + 제목 한 줄
export function HeaderMini({ icon, href, title, tone = "light" }: HeaderMiniProps) {
  return (
    <header className={`flex items-center gap-2 ${tone === "dark" ? "text-white" : "text-ink"}`}>
      <Link href={href} aria-label={LABELS[icon]} className="active:opacity-60">
        <Icon name={icon} />
      </Link>
      <h1 className="text-link font-bold">{title}</h1>
    </header>
  );
}
