// Home › 아이템 피드(H-01)의 주소. 검색어와 고른 카테고리를 주소에 실어 둔다 —
// 서버가 거르기 때문이기도 하고, 뒤로 가기 · 새로고침 · 공유에도 그대로 남는다
export function feedPath({ q, category }: { q?: string | null; category?: string | null } = {}) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  if (category) params.set("category", category);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
