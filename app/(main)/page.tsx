import type { Metadata } from "next";
import { HomeTabs } from "@/components/home/HomeTabs";
import { ItemFeed } from "@/components/home/ItemFeed";
import { toGridColumns } from "@/components/inventory/Slot";
import { requireProfile } from "@/lib/auth/profile";
import { isFixedCategory } from "@/lib/categories";
import { getPublicItemFeed } from "@/lib/item/queries";
import { hasUnreadNotifications } from "@/lib/notification/queries";
import { StickyTop } from "@/components/ui/StickyTop";

export const metadata: Metadata = { title: "INMYIN" };

// H-01 · 홈 › 아이템. 모든 사람의 공개 아이템이 최신순으로 모인다 (내 것도 남들 사이에 같이 보인다).
// 검색어와 카테고리는 주소(?q=&category=)에서 읽어 서버가 거른다. 카테고리 칩은 고정 8개 — 아이템이 든 인벤토리의 카테고리로 거른다.
// 8개 밖의 값(전에 쓰던 인기 태그 주소 등)은 전체로 본다
export default async function Home(props: PageProps<"/">) {
  const profile = await requireProfile();
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const category = isFixedCategory(searchParams.category) ? searchParams.category : null;

  const [items, unread] = await Promise.all([getPublicItemFeed({ q, category: category ?? undefined }), hasUnreadNotifications()]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      <StickyTop>
        <HomeTabs current="items" unread={unread} />
      </StickyTop>
      <ItemFeed items={items} q={q} category={category} columns={toGridColumns(profile.grid_columns)} />
    </div>
  );
}
