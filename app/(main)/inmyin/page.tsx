import type { Metadata } from "next";
import Link from "next/link";
import { HomeTabs } from "@/components/home/HomeTabs";
import { PostCard } from "@/components/inmyin/PostCard";
import { CategoryTag } from "@/components/ui/CategoryTag";
import { ChipRow } from "@/components/ui/ChipRow";
import { requireProfile } from "@/lib/auth/profile";
import { postFeedPath, type PostSort } from "@/lib/inmyin/paths";
import { getPostFeed } from "@/lib/inmyin/queries";
import { getPopularCategories } from "@/lib/item/queries";
import { hasUnreadNotifications } from "@/lib/notification/queries";

export const metadata: Metadata = { title: "INMYIN" };

const SORTS: { id: PostSort; label: string }[] = [
  { id: "popular", label: "인기순" },
  { id: "latest", label: "최신순" },
];

// H-03 · Home › INMYIN 목록. 모든 사람의 게시물을 카드로. 카테고리(게시물에 든 아이템의 태그)와 정렬은 주소(?category=&sort=)에 실어 서버가 거른다.
// 피그마 웹은 카테고리를 동그란 사진 칩으로 그렸지만, 폰의 H-01 과 같은 칩(CategoryTag)으로 맞췄다 — 태그마다 대표 사진이 없다
export default async function InmyinFeedPage(props: PageProps<"/inmyin">) {
  await requireProfile();
  const searchParams = await props.searchParams;
  const category = typeof searchParams.category === "string" && searchParams.category ? searchParams.category : null;
  const sort: PostSort = searchParams.sort === "popular" ? "popular" : "latest";

  const [posts, categories, unread] = await Promise.all([getPostFeed({ category, sort }), getPopularCategories(), hasUnreadNotifications()]);
  const chips = category && !categories.includes(category) ? [category, ...categories] : categories;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      <HomeTabs current="inmyin" unread={unread} />

      <div className="mt-5 flex items-center gap-2.5 pl-5">
        <ChipRow>
          <CategoryTag label="전체" selected={category === null} href={postFeedPath({ sort })} />
          {chips.map((tag) => (
            <CategoryTag key={tag} label={tag} selected={category === tag} href={postFeedPath({ category: tag, sort })} />
          ))}
        </ChipRow>
      </div>

      {/* 피그마 H-03: 오른쪽 끝에 인기순 | 최신순 */}
      <p className="mt-4 flex justify-end gap-1 px-5 text-label">
        {SORTS.map((entry, index) => (
          <span key={entry.id} className="flex gap-1">
            {index > 0 && <span className="text-disabled">|</span>}
            <Link href={postFeedPath({ category, sort: entry.id })} replace scroll={false} aria-current={sort === entry.id ? "true" : undefined} className={sort === entry.id ? "font-bold text-ink" : "text-ink-muted"}>
              {entry.label}
            </Link>
          </span>
        ))}
      </p>

      {posts.length === 0 ? (
        <p className="mt-16 px-5 text-center text-body text-ink-muted">{category ? "이 태그의 INMYIN 이 아직 없어요." : "아직 INMYIN 이 없어요. My 에서 첫 INMYIN 을 만들어 보세요."}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-x-3.5 gap-y-6 px-5 pb-10 lg:grid-cols-5">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
