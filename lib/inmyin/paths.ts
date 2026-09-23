// INMYIN 게시물 화면의 주소. Home › INMYIN 목록(H-03)은 /inmyin, 상세(H-04)는 /inmyin/<게시물 id>

export type PostSort = "latest" | "popular";

export function postPath(postId: string) {
  return `/inmyin/${postId}`;
}

// 카테고리와 정렬은 주소에 싣는다 (H-01 처럼 뒤로 가기 · 새로고침 · 공유에 남게)
export function postFeedPath({ category, sort }: { category?: string | null; sort?: PostSort } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (sort === "popular") params.set("sort", "popular");
  const query = params.toString();
  return `/inmyin${query ? `?${query}` : ""}`;
}
