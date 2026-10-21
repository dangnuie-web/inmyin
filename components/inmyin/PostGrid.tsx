import { PostCard } from "./PostCard";
import type { FeedPost } from "@/lib/inmyin/queries";
import { EmptyBag, type EmptyState } from "@/components/ui/EmptyBag";
import { NumText } from "@/components/ui/NumText";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

// 게시물 카드 격자 — 폰 2열, 웹 5열(1280 이상 6열) (H-03 · 프로필의 INMYIN 목록 · 북마크 탭의 INMYIN 갈래 공용).
// note(12개)는 격자 바로 위 왼쪽 — 모아보기 · 북마크의 사용량 줄과 같은 자리 · 모양 (무늬 빈화면프로필설계 v01 5절. 전에는 격자 아래).
// 비었으면 빈 가방(EmptyBag). 그때도 note 줄은 남긴다
// addHref — 내 INMYIN 목록에서 맨 앞에 "+ 만들기" 카드. 최신순이라 새로 만든 것이 놓일 자리(맨 앞)에 둔다.
// 2026-10-22 당니님: 폰은 INMYIN 이 하나라도 있으면 만들기 입구가 없었음(bbe5b33 에서 프로필 INMYIN 줄과 함께 빠짐) → 인벤토리 + 칸과 같은 결로
export function PostGrid({ posts, empty, note, addHref }: { posts: FeedPost[]; empty: EmptyState; note?: string; addHref?: string }) {
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
          {addHref && (
            <li>
              <Link href={addHref} aria-label="INMYIN 만들기" className="flex flex-col gap-2 active:opacity-80">
                <span className="flex aspect-[4/5] items-center justify-center rounded-md border border-border bg-white text-disabled">
                  <Icon name="plus" scale={2} />
                </span>
                <span className="flex h-7 items-center text-caption text-ink-muted">INMYIN 만들기</span>
              </Link>
            </li>
          )}
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
