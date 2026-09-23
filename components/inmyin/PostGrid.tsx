import { PostCard } from "./PostCard";
import type { FeedPost } from "@/lib/inmyin/queries";

// 게시물 카드 격자 — 폰 2열, 웹 5열 (H-03 · 프로필의 INMYIN 목록 · Bookmark 탭의 INMYIN 갈래 공용)
export function PostGrid({ posts, emptyText, note }: { posts: FeedPost[]; emptyText: string; note?: string }) {
  if (posts.length === 0) return <p className="mt-16 px-5 text-center text-body text-ink-muted">{emptyText}</p>;
  return (
    <>
      <ul className="mt-4 grid grid-cols-2 gap-x-3.5 gap-y-6 px-5 pb-10 lg:grid-cols-5">
        {posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
      {note && <p className="mb-6 text-center text-label font-bold">{note}</p>}
    </>
  );
}
