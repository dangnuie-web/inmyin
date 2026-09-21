// 화면 곳곳에서 쓰는 작은 아이콘. 색은 currentColor 라서 부모의 글자색을 따라간다.
// close · dropdown 은 피그마에서 내보낸 그림 그대로다.
// back · plus 는 아직 피그마 SVG를 받지 못해 임시로 그렸다 — 받으면 path 만 바꾼다.

const ICONS = {
  // 피그마 `이동` 컴포넌트의 닫기. 64 × 64 칸 가운데에 놓인다
  close: {
    size: 64,
    body: (
      <path
        d="M43 22.4033L33.4131 31.999L43 41.5957L41.5869 43.0107L32 33.4141L22.4131 43.0107L21 41.5957L30.5859 31.999L21 22.4033L22.4141 20.9893L32 30.584L41.5859 20.9893L43 22.4033Z"
        fill="currentColor"
      />
    ),
  },
  // 임시 — 닫기와 같은 칸 크기·선 굵기로 맞췄다
  back: {
    size: 64,
    body: (
      <path d="M37 21L26 32L37 43" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  // 피그마의 드롭다운 화살표. 흰 원 안에 검은 세모
  dropdown: {
    size: 26,
    body: (
      <>
        <circle cx="13" cy="13" r="13" fill="white" />
        <path d="M13.5 18L7.00481 10.5L19.9952 10.5L13.5 18Z" fill="black" />
      </>
    ),
  },
  // 임시 — 인벤토리 추가 칸의 +
  plus: {
    size: 20,
    body: <path d="M10 2V18M2 10H18" stroke="currentColor" strokeWidth="4" />,
  },
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const { size, body } = ICONS[name];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" className={className} aria-hidden>
      {body}
    </svg>
  );
}
