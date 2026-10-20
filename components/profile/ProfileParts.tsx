import { NumText } from "@/components/ui/NumText";

// 내 프로필(M-01)과 타유저 프로필(H-06)이 같이 쓰는 조각들

// 프로필 위쪽의 버튼 (프로필 관리 · 프로필 공유 · 팔로우)
export const PROFILE_ACTION_CLASS = "flex h-9.5 flex-1 items-center justify-center rounded-sm bg-ink text-label font-bold text-white active:opacity-80";
// 프로필 공유처럼 편집 · 팔로우 옆에 서는 보조 버튼. 한 줄에 검정은 하나 — 무늬 흑백버튼설계 v01 3-4
export const PROFILE_ACTION_OUTLINE_CLASS = "flex h-9.5 flex-1 items-center justify-center rounded-sm border border-disabled bg-white text-label font-bold text-ink active:opacity-60";
// 작은 보조 버튼 (32). 프로필 격자 이름 줄의 관리 · 짐싸기
export const SMALL_OUTLINE_CLASS = "flex h-8 shrink-0 items-center justify-center rounded-sm border border-disabled bg-white px-3.5 text-label font-bold text-ink active:opacity-60";

// 줄의 제목. 큰 제목 옆에 작은 숫자가 붙는다 (데스크 10/25). 제목이 길면 말줄임
export function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <h2 className="flex min-w-0 items-baseline gap-3 text-link font-bold">
      <span className="min-w-0 truncate">{title}</span>
      <span className="shrink-0 text-caption font-normal text-ink-muted">
        <NumText text={note} />
      </span>
    </h2>
  );
}
