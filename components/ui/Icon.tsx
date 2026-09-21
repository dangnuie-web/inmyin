// 화면 곳곳에서 쓰는 작은 아이콘. 피그마에서 내보낸 그림 그대로다.
// 색은 currentColor 라서 부모의 글자색을 따라간다.

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
  // 피그마 `이동` 컴포넌트의 뒤로가기. 원본은 15 × 26 이라, 닫기와 같은 64 × 64 칸 가운데로 옮겨 적었다
  back: {
    size: 64,
    body: <path d="M37.9142 19.7072L25.9142 31.7072L37.9142 43.7072" stroke="currentColor" strokeWidth="2" />,
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
  // 인벤토리 추가 칸의 +
  plus: {
    size: 21,
    body: (
      <>
        <rect x="7.57007" width="5.04673" height="20.1869" fill="currentColor" />
        <rect y="7.57007" width="20.1869" height="5.04673" fill="currentColor" />
      </>
    ),
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
