import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/profile/Avatar";
import { postPath } from "@/lib/inmyin/paths";
import type { FeedPost } from "@/lib/inmyin/queries";

// H-03 의 카드 — 4:5 이미지 · 아바타 닉네임 · 제목 한 줄. 누르면 상세(H-04)
export function PostCard({ post }: { post: FeedPost }) {
  return (
    <Link href={postPath(post.id)} className="flex flex-col gap-2 active:opacity-80">
      <span className="relative block aspect-[4/5] overflow-hidden rounded-md border border-border bg-white">
        <Image src={post.imageUrl} alt="" fill sizes="(min-width: 1024px) 180px, 45vw" unoptimized className="object-cover" />
      </span>
      <span className="flex items-center gap-2">
        <Avatar url={post.author.avatarUrl} size={28} />
        <span className="truncate text-caption">{post.author.nickname}</span>
      </span>
      <span className="truncate text-label font-semibold">{post.title}</span>
    </Link>
  );
}
