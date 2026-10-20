import type { ReactNode } from "react";
import { SectionTitle } from "@/components/profile/ProfileParts";
import { Icon } from "@/components/ui/Icon";

// 프로필 격자의 이름 줄 — "데스크 10/25 🔒 ……… [관리] [짐싸기]" (무늬 빈화면프로필설계 v01 3-2).
// 숫자는 내 것이면 쓴 칸/칸 수(카테고리로 걸러도 전체), 남의 것이면 보이는 수/칸 수 — 전에 화면 바닥 알약에 있던 숫자.
// 자물쇠 · 버튼은 내 것만. 폰 · 웹 같은 자리(웹은 회색 판 안)
export function InventoryTitleRow({ name, note, locked = false, children }: { name: string; note: string; locked?: boolean; children?: ReactNode }) {
  return (
    <div className="mt-5 flex h-10 items-center px-5">
      <SectionTitle title={name} note={note} />
      {locked && (
        <span role="img" aria-label="비공개" className="ml-2 shrink-0 text-ink-muted">
          <Icon name="lock" scale={2 / 3} />
        </span>
      )}
      {children && <div className="ml-auto flex shrink-0 gap-2 pl-3">{children}</div>}
    </div>
  );
}
