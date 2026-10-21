import Image from "next/image";

// 사진이 없을 때의 사람 그림 — 무늬 빈 프로필 1안 "떠 있는 사람"(2026-10-21 당니님 결정). 원 안에 머리와 반원 몸이 떠 있다.
// 선 1.75 둥근 끝(하단 탭 아이콘 세트와 같은 결). 2026-10-21 당니님: 선은 옅어 보여서 모든 크기를 채운 그림으로. 색은 currentColor
// 시안: 오피스 디자인/아이콘/20261021_inmyin_빈프로필시안_v01.svg #person-float
export function PersonMark({ size, filled = true }: { size: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="20" cy="15.25" r="3.5" />
      <path d="M13.25 28.25 A6.75 6.75 0 0 1 26.75 28.25 Z" />
    </svg>
  );
}

// 프로필 사진. 없으면 사람 그림 (내 프로필 M-01 과 같은 규칙)
export function Avatar({ url, size, className = "" }: { url: string | null; size: number; className?: string }) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-2 text-gray-mid ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
        <Image src={url} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" />
      ) : (
        <PersonMark size={size} />
      )}
    </span>
  );
}
