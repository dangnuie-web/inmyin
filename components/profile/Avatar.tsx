import Image from "next/image";

// 사진이 없을 때의 사람 그림. 원래 하단 탭 My(피그마, 지금 프로필)의 채운 그림이었다 — 탭은 2026-10-20 새 아이콘 세트로 바뀌었지만
// 빈 프로필 사진은 그 결정의 범위가 아니라 전의 그림 그대로 둔다. 40px, 색은 currentColor
export function PersonMark() {
  return (
    <svg width={40} height={40} viewBox="-1.5 0 47 47" fill="currentColor" aria-hidden>
      <path d="M29.5439 25.6382C37.5203 25.6384 44.0009 32.1041 44.001 40.0718V44.7524C44.001 45.4427 43.4411 46.0022 42.751 46.0024H1.25C0.559644 46.0024 0 45.4428 0 44.7524V40.0718C8.79065e-05 32.104 6.48047 25.6382 14.457 25.6382H29.5439ZM21.9951 0.997559C27.7963 0.997559 32.5028 5.69252 32.5029 11.4888C32.5029 17.2852 27.7964 21.981 21.9951 21.981C16.1939 21.9809 11.4873 17.2851 11.4873 11.4888C11.4875 5.69258 16.194 0.997649 21.9951 0.997559Z" />
    </svg>
  );
}

// 프로필 사진. 없으면 사람 그림 (내 프로필 M-01 과 같은 규칙)
export function Avatar({ url, size, className = "" }: { url: string | null; size: number; className?: string }) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-2 text-disabled ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        // 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다
        <Image src={url} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" />
      ) : (
        <span style={{ transform: `scale(${size / 96})` }}>
          <PersonMark />
        </span>
      )}
    </span>
  );
}
