import type { Metadata } from "next";
import Link from "next/link";
import { PostGrid } from "@/components/inmyin/PostGrid";
import { toGridColumns } from "@/components/inventory/Slot";
import { ItemCollection } from "@/components/item/ItemCollection";
import { requireProfile } from "@/lib/auth/profile";
import { getMyBookmarkedItems } from "@/lib/bookmark/queries";
import { getMyBookmarkedPosts } from "@/lib/inmyin/queries";
import { planLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "Bookmark · INMYIN" };

const TABS = [
  { id: "items", label: "아이템", href: "/bookmark" },
  { id: "inmyin", label: "INMYIN", href: "/bookmark?tab=inmyin" },
] as const;

// V-01 · V-02 · Bookmark › 북마크한 아이템 / INMYIN. 하단 탭의 Bookmark. 위는 아이템 · INMYIN 두 갈래 (주소 ?tab=inmyin).
// 남의 것이 모이는 곳이라 리스트의 줄에 "닉네임 · 인벤토리"가 붙는다 — 내 인벤토리에 들어온 것이 아니다.
// 검색 · 카테고리는 모아보기(M-13)처럼 브라우저에서 바로 거른다
export default async function BookmarkPage(props: PageProps<"/bookmark">) {
  const profile = await requireProfile();
  const tab = (await props.searchParams).tab === "inmyin" ? "inmyin" : "items";
  const { maxBookmarks } = planLimits(profile.plan);
  const [items, posts] = await Promise.all([tab === "items" ? getMyBookmarkedItems(profile.id) : [], tab === "inmyin" ? getMyBookmarkedPosts(profile.id) : []]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      {/* Home 의 갈래와 같은 모양 — 고른 쪽에만 밑줄 */}
      <nav aria-label="Bookmark 갈래" className="mb-5 flex items-end gap-9 px-5 pt-5 text-body font-bold text-ink">
        {TABS.map((entry) =>
          entry.id === tab ? (
            <span key={entry.id} aria-current="page" className="-mx-0.5 border-b-2 border-ink px-0.5 pb-1 leading-none">
              {entry.label}
            </span>
          ) : (
            <Link key={entry.id} href={entry.href} className="-mx-0.5 border-b-2 border-transparent px-0.5 pb-1 leading-none active:opacity-60">
              {entry.label}
            </Link>
          ),
        )}
      </nav>
      {tab === "items" ? (
        // 아래 숫자는 모은 개수 / 플랜 한도 (lib/plans.ts 의 maxBookmarks). 아이템 · INMYIN 을 합쳐 센다
        <ItemCollection items={items} capacity={maxBookmarks} columns={toGridColumns(profile.grid_columns)} emptyText="아직 북마크한 아이템이 없어요. 홈에서 책갈피를 눌러 모아 보세요." sortable />
      ) : (
        <PostGrid posts={posts} emptyText="아직 북마크한 INMYIN 이 없어요. 게시물에서 책갈피를 눌러 모아 보세요." note={`${posts.length}개`} />
      )}
    </div>
  );
}
