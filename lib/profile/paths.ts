export type FollowTab = "followers" | "following";

// 팔로워 · 팔로잉 목록(M-12)의 주소. 내 것도 남의 것도 같은 화면 — 아이디로 연다
export function followsPath(handle: string, tab: FollowTab = "followers") {
  return `/u/${handle}/follows${tab === "following" ? "?tab=following" : ""}`;
}

// 타유저 프로필(H-06). 아직 화면은 없고 주소만 정해 둔다
export function profilePath(handle: string) {
  return `/u/${handle}`;
}

// 타유저의 인벤토리 목록(H-07) · 인벤토리 상세(H-08) · 아이템 모아보기. 보기 방식과 카테고리는 M-04 처럼 주소에 싣는다
export function otherInventoriesPath(handle: string) {
  return `/u/${handle}/inventories`;
}

export function otherInventoryPath(handle: string, inventoryId: string, options: { view?: "grid" | "list"; category?: string | null } = {}) {
  const params = new URLSearchParams();
  if (options.view === "list") params.set("view", "list");
  if (options.category) params.set("category", options.category);
  const query = params.toString();
  return `/u/${handle}/inventories/${inventoryId}${query ? `?${query}` : ""}`;
}

export function otherItemsPath(handle: string) {
  return `/u/${handle}/items`;
}
