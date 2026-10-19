// 하단 탭 · 상단 아이콘 세트 v01 — 2026-10-20 무늬(디자인)가 직접 그림 (외부 아이콘 없음).
// 원본: 오피스 inmyin/디자인/화면손질/20261020_inmyin_탭아이콘_v01.svg · 설계서 2-4절.
// 규칙: 24 칸, 선 1.75, 끝 · 꺾임 round. 곡선은 로고의 n 아치(위가 반원인 ⌒) — 프로필 어깨 · 집 문 · 종 몸통이 같은 아치.
// 꺼짐 = 선만. 켜짐 = 같은 path 를 채움. 속이 비어야 하는 곳(집 문 · 나침반 바늘)은 evenodd 로 구멍을 내 바탕색이 비친다.
// 색은 currentColor 라서 부모의 글자색(text-ink 등)을 따라간다.

const ICONS = {
  home: {
    d: "M4.25 11.25 L12 4.5 L19.75 11.25 V18.5 A1.75 1.75 0 0 1 18 20.25 H6 A1.75 1.75 0 0 1 4.25 18.5 Z M9.5 20.25 V15.25 A2.5 2.5 0 0 1 14.5 15.25 V20.25 Z",
    evenodd: true,
  },
  discover: {
    d: "M12 3.25 A8.75 8.75 0 1 0 12.001 3.25 Z M15.75 8.25 L13.6 13.6 L8.25 15.75 L10.4 10.4 Z",
    evenodd: true,
  },
  bookmark: {
    d: "M6.5 4.25 H17.5 A1.75 1.75 0 0 1 19.25 6 V20 L12 15.25 L4.75 20 V6 A1.75 1.75 0 0 1 6.5 4.25 Z",
    evenodd: false,
  },
  // 머리 원 + 어깨 반원 아치 (아래가 열린 로고 n 아치)
  profile: {
    d: "M12 3.75 A3.5 3.5 0 1 0 12.001 3.75 Z M5.25 20.25 A6.75 6.75 0 0 1 18.75 20.25 Z",
    evenodd: false,
  },
};

export type TabIconName = keyof typeof ICONS;

// 그림 칸(24)에서의 선 굵기. 크기를 바꿔도 비율대로 따라간다
const STROKE = 1.75;

// 탭에서는 24px — 로고 28px 의 획과 같은 무게 (설계서 2-4)
export function TabIcon({ name, active, size = 24 }: { name: TabIconName; active: boolean; size?: number }) {
  const icon = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"}
      fillRule={active && icon.evenodd ? "evenodd" : undefined}
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={icon.d} />
    </svg>
  );
}

// 가운데 탭의 + (검정 원 안의 흰 +). 원 40 안에 26 으로 그려 선이 1.9 쯤 된다
export function PlusMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" aria-hidden>
      <path d="M12 5.75 V18.25 M5.75 12 H18.25" />
    </svg>
  );
}
