export type InventoryView = "grid" | "list";

type InventoryPathOptions = {
  view?: InventoryView;
  category?: string | null;
  // 방금 등록한 아이템의 id. 상세 화면이 그 칸으로 스크롤하고 잠깐 강조한 뒤 주소에서 지운다
  added?: string;
};

// 인벤토리 상세(M-04)의 주소. 보기 방식과 고른 카테고리를 주소에 실어 둔다 —
// 새로고침하거나 다른 인벤토리로 갈아타도 보던 방식이 유지된다
export function inventoryPath(id: string, options: InventoryPathOptions = {}) {
  const params = new URLSearchParams();
  // grid 가 기본이라 주소에 적지 않는다
  if (options.view === "list") params.set("view", "list");
  if (options.category) params.set("category", options.category);
  if (options.added) params.set("added", options.added);
  const query = params.toString();
  return `/my/inventories/${id}${query ? `?${query}` : ""}`;
}

// 아이템 정보 입력(M-08)의 주소
export function newItemPath(inventoryId: string) {
  return `/my/inventories/${inventoryId}/items/new`;
}

// 인벤토리 정보 입력의 주소
export const NEW_INVENTORY_PATH = "/my/inventories/new";

// 촬영 화면(M-06)의 주소. 아이템용과 인벤토리용이 따로 있다 — 찍은 뒤에 갈 곳이 다르다
export function itemCameraPath(inventoryId: string) {
  return `/my/inventories/${inventoryId}/items/camera`;
}
export const NEW_INVENTORY_CAMERA_PATH = `${NEW_INVENTORY_PATH}/camera`;
