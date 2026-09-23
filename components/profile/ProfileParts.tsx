import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { postPath } from "@/lib/inmyin/paths";
import { itemPath } from "@/lib/inventory/paths";
import type { ProfileItem, ProfilePost } from "@/lib/profile/queries";

// 내 프로필(M-01)과 타유저 프로필(H-06)이 같이 쓰는 조각들

// 프로필 위쪽의 버튼 (프로필 관리 · 프로필 공유 · 팔로우)
export const PROFILE_ACTION_CLASS = "flex h-9.5 flex-1 items-center justify-center rounded-sm bg-ink text-label font-bold text-white active:opacity-80";

// 줄의 제목. 큰 영문 제목 옆에 작은 숫자가 붙는다 (INVENTORY 5/25)
export function SectionTitle({ title, note }: { title: string; note: string }) {
  return (
    <h2 className="flex items-baseline gap-3 text-link font-bold">
      {title}
      <span className="text-caption font-normal">{note}</span>
    </h2>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="break-keep px-5 text-label text-ink-muted">{children}</p>;
}

// ITEM 줄의 최근 아이템. 한 화면에 딱 다섯 칸이 보인다 — 칸 사이 간격 넷(9px × 4)을 뺀 너비를 다섯으로 나눈다
export function RecentItems({ items }: { items: ProfileItem[] }) {
  return (
    <ul className="flex gap-2.25 overflow-x-auto px-5 [scrollbar-width:none]">
      {items.map((item) => (
        <li key={item.id} className="shrink-0 basis-[calc((100%-2.25rem)/5)]">
          <Link href={itemPath(item.id)} aria-label={item.name} className="relative block aspect-square overflow-hidden rounded-md bg-gray-1 active:opacity-80">
            {/* 올릴 때 이미 작게 줄여 둔 사진이라 Next 의 이미지 최적화를 거치지 않는다 */}
            <Image src={item.imageUrl} alt="" fill sizes="64px" unoptimized className="object-cover" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// 프로필 INMYIN 줄의 게시물 카드 — 4:5 이미지, 한 화면에 셋. 누르면 상세(H-04)
export function RecentPosts({ posts }: { posts: ProfilePost[] }) {
  return (
    <ul className="flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none]">
      {posts.map((post) => (
        <li key={post.id} className="shrink-0 basis-[calc((100%-1.25rem)/3)]">
          <Link href={postPath(post.id)} aria-label={post.title} className="relative block aspect-[4/5] overflow-hidden rounded-md border border-border bg-white active:opacity-80">
            <Image src={post.imageUrl} alt="" fill sizes="120px" unoptimized className="object-cover" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
