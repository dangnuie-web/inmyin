import type { Metadata } from "next";
import { HomeTabs } from "@/components/home/HomeTabs";
import { ItemFeed } from "@/components/home/ItemFeed";
import { toGridColumns } from "@/components/inventory/Slot";
import { requireProfile } from "@/lib/auth/profile";
import { getPopularCategories, getPublicItemFeed } from "@/lib/item/queries";
import { hasUnreadNotifications } from "@/lib/notification/queries";

export const metadata: Metadata = { title: "INMYIN" };

// H-01 · Home › 아이템. 모든 사람의 공개 아이템이 최신순으로 모인다 (내 것도 남들 사이에 같이 보인다).
// 검색어와 카테고리는 주소(?q=&category=)에서 읽어 서버가 거른다
export default async function Home(props: PageProps<"/">) {
  const profile = await requireProfile();
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";
  const category = typeof searchParams.category === "string" && searchParams.category ? searchParams.category : null;

  const [items, categories, unread] = await Promise.all([getPublicItemFeed({ q, category: category ?? undefined }), getPopularCategories(), hasUnreadNotifications()]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-web">
      <HomeTabs current="items" unread={unread} />
      <ItemFeed items={items} q={q} category={category} categories={categories} columns={toGridColumns(profile.grid_columns)} />
    </div>
  );
}
