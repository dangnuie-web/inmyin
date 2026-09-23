"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { PostHotspot } from "@/lib/inmyin/queries";
import { itemPath } from "@/lib/inventory/paths";

// 라벨의 설명 한 줄. 넘치면 …
const DESCRIPTION_PREVIEW = 12;

// H-04 의 게시물 이미지. 인스타그램의 사람 태그처럼 — 평소엔 편집된 이미지만 보이고, 한 번 누르면 아이템 라벨(이름 · 설명)이 뜬다.
// 라벨을 누르면 그 아이템 상세(H-02 모양), 라벨 바깥을 누르면 라벨이 다시 숨는다.
// 지워졌거나 안 보이는 아이템은 라벨이 없다 — 이미지는 그대로, 누를 곳만 없다 (docs/screens.md H-04)
export function PostImage({ imageUrl, title, hotspots }: { imageUrl: string; title: string; hotspots: PostHotspot[] }) {
  const [shown, setShown] = useState(false);

  return (
    <div
      onClick={() => setShown((on) => !on)}
      role={hotspots.length > 0 ? "button" : undefined}
      aria-pressed={hotspots.length > 0 ? shown : undefined}
      aria-label={hotspots.length > 0 ? (shown ? "아이템 라벨 숨기기" : "아이템 라벨 보기") : undefined}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-border bg-white"
    >
      <Image src={imageUrl} alt={title} fill sizes="(min-width: 448px) 400px, 90vw" unoptimized priority className="object-contain" />
      {shown &&
        hotspots.map((spot) => (
          <Link
            key={spot.itemId}
            href={itemPath(spot.itemId, { from: "home" })}
            className="absolute flex max-w-[45%] -translate-x-1/2 -translate-y-1/2 animate-slot-pop flex-col rounded-sm bg-ink/40 px-2 py-1 text-white active:bg-ink/60"
            style={{ left: `${(spot.x + spot.w / 2) * 100}%`, top: `${(spot.y + spot.h / 2) * 100}%` }}
          >
            <span className="truncate text-caption font-semibold">{spot.name}</span>
            {spot.description && <span className="truncate text-[10px]">{spot.description.length > DESCRIPTION_PREVIEW ? `${spot.description.slice(0, DESCRIPTION_PREVIEW)}…` : spot.description}</span>}
          </Link>
        ))}
    </div>
  );
}
