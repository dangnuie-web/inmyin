import { PostCard } from "./PostCard";
import type { FeedPost } from "@/lib/inmyin/queries";
import { EmptyBag, type EmptyState } from "@/components/ui/EmptyBag";
import { NumText } from "@/components/ui/NumText";

// 게시물 카드 격자 — 폰 2열, 웹 5열(1280 이상 6열) (H-03 · 프로필의 INMYIN 목록 · 북마크 탭의 INMYIN 갈래 공용).
// note(12개)는 격자 바로 위 왼쪽 — 모아보기 · 북마크의 사용량 줄과 같은 자리 · 모양 (무늬 빈화면프로필설계 v01 5절. 전에는 격자 아래).
// 비었으면 빈 가방(EmptyBag). 그때도 note 줄은 남긴다
export function PostGrid({ posts, empty, note }: { posts: FeedPost[]; empty: EmptyState; note?: string }) {
  return (
    <>
      {note && (
        <p className="mt-4 flex h-6 items-center px-5 text-caption text-ink-muted">
          <NumText text={note} />
        </p>
      )}
      {posts.length === 0 ? (
        <EmptyBag action={empty.action} secondary={empty.secondary}>
          {empty.text}
        </EmptyBag>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-x-3.5 gap-y-6 px-5 pb-10 lg:grid-cols-5 lg:gap-x-5 lg:gap-y-7 xl:grid-cols-6">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
