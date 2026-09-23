import Image from "next/image";
import Link from "next/link";
import type { PostHotspot } from "@/lib/inmyin/queries";
import { itemPath } from "@/lib/inventory/paths";

// 라벨의 설명 한 줄. 넘치면 …
const DESCRIPTION_PREVIEW = 12;

// H-04 의 게시물 이미지 — 그 위에 아이템 라벨(이름 · 설명 한 줄)이 탭 영역이다. 누르면 그 아이템 상세(H-02 모양).
// 지워졌거나 안 보이는 아이템은 라벨이 없다 — 이미지는 그대로, 누를 곳만 없다 (docs/screens.md H-04)
export function PostImage({ imageUrl, title, hotspots }: { imageUrl: string; title: string; hotspots: PostHotspot[] }) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-border bg-white">
      <Image src={imageUrl} alt={title} fill sizes="(min-width: 448px) 400px, 90vw" unoptimized priority className="object-contain" />
      {hotspots.map((spot) => (
        <Link
          key={spot.itemId}
          href={itemPath(spot.itemId, { from: "home" })}
          className="absolute flex max-w-[45%] -translate-x-1/2 -translate-y-1/2 flex-col rounded-sm bg-ink/30 px-2 py-1 text-white active:bg-ink/50"
          style={{ left: `${(spot.x + spot.w / 2) * 100}%`, top: `${(spot.y + spot.h / 2) * 100}%` }}
        >
          <span className="truncate text-caption font-semibold">{spot.name}</span>
          {spot.description && <span className="truncate text-[10px]">{spot.description.length > DESCRIPTION_PREVIEW ? `${spot.description.slice(0, DESCRIPTION_PREVIEW)}…` : spot.description}</span>}
        </Link>
      ))}
    </div>
  );
}
