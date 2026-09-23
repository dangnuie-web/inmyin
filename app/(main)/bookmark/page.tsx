import type { Metadata } from "next";
import { toGridColumns } from "@/components/inventory/Slot";
import { ItemCollection } from "@/components/item/ItemCollection";
import { SoonButton } from "@/components/profile/SoonButton";
import { requireProfile } from "@/lib/auth/profile";
import { getMyBookmarkedItems } from "@/lib/bookmark/queries";
import { planLimits } from "@/lib/plans";

export const metadata: Metadata = { title: "Bookmark · INMYIN" };

// V-01 · Bookmark › 북마크한 아이템. 하단 탭의 Bookmark. 위는 아이템 · INMYIN 두 갈래 (INMYIN 은 3단계).
// 남의 것이 모이는 곳이라 리스트의 줄에 "닉네임 · 인벤토리"가 붙는다 — 내 인벤토리에 들어온 것이 아니다.
// 검색 · 카테고리는 모아보기(M-13)처럼 브라우저에서 바로 거른다
export default async function BookmarkPage() {
  const profile = await requireProfile();
  const items = await getMyBookmarkedItems(profile.id);
  const { maxBookmarks } = planLimits(profile.plan);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      {/* Home 의 갈래와 같은 모양 — 고른 쪽에만 밑줄 */}
      <nav aria-label="Bookmark 갈래" className="mb-5 flex items-end gap-9 px-5 pt-5 text-body font-bold text-ink">
        <span aria-current="page" className="-mx-0.5 border-b-2 border-ink px-0.5 pb-1 leading-none">
          아이템
        </span>
        <SoonButton notice="INMYIN 게시물은 3단계에서 만들어요." className="-mx-0.5 border-b-2 border-transparent px-0.5 pb-1 leading-none active:opacity-60">
          INMYIN
        </SoonButton>
      </nav>
      {/* 아래 숫자는 모은 개수 / 플랜 한도 (lib/plans.ts 의 maxBookmarks) */}
      <ItemCollection items={items} capacity={maxBookmarks} columns={toGridColumns(profile.grid_columns)} emptyText="아직 북마크한 아이템이 없어요. 홈에서 책갈피를 눌러 모아 보세요." sortable />
    </div>
  );
}
