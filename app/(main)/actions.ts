"use server";

import { requireProfile } from "@/lib/auth/profile";
import type { FeedFilter, FeedItem } from "@/lib/item/feed";
import { getPublicItemFeed } from "@/lib/item/queries";

// Home 피드(H-01)의 "더 보기". 마지막 아이템보다 오래된 것을 한 장 더 읽는다
export async function loadMoreFeed(filter: FeedFilter): Promise<FeedItem[]> {
  await requireProfile();
  return getPublicItemFeed({
    q: typeof filter.q === "string" ? filter.q : undefined,
    category: typeof filter.category === "string" ? filter.category : undefined,
    before: typeof filter.before === "string" ? filter.before : undefined,
  });
}
