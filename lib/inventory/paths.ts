export type InventoryView = "grid" | "list";

// 인벤토리 상세(M-04)의 주소. 보기 방식과 고른 카테고리를 주소에 실어 둔다 —
// 새로고침하거나 다른 인벤토리로 갈아타도 보던 방식이 유지된다
export function inventoryPath(id: string, options: { view?: InventoryView; category?: string | null } = {}) {
  const params = new URLSearchParams();
  // grid 가 기본이라 주소에 적지 않는다
  if (options.view === "list") params.set("view", "list");
  if (options.category) params.set("category", options.category);
  const query = params.toString();
  return `/my/inventories/${id}${query ? `?${query}` : ""}`;
}
