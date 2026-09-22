import Image from "next/image";
import { TabIcon } from "@/components/ui/TabIcon";

// 프로필 사진. 없으면 하단 탭 My 와 같은 사람 그림 (내 프로필 M-01 과 같은 규칙)
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
          <TabIcon name="my" active />
        </span>
      )}
    </span>
  );
}
