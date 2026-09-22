export type InventoryView = "grid" | "list";

type InventoryPathOptions = {
  view?: InventoryView;
  category?: string | null;
  // 방금 등록한(또는 되살린) 아이템의 id. 상세 화면이 그 칸으로 스크롤하고 잠깐 강조한 뒤 주소에서 지운다
  added?: string;
  // 방금 지운 아이템의 id. 상세 화면이 "되돌리기"를 잠깐 띄운 뒤 주소에서 지운다
  deleted?: string;
};

// 인벤토리 상세(M-04)의 주소. 보기 방식과 고른 카테고리를 주소에 실어 둔다 —
// 새로고침하거나 다른 인벤토리로 갈아타도 보던 방식이 유지된다
export function inventoryPath(id: string, options: InventoryPathOptions = {}) {
  const params = new URLSearchParams();
  // grid 가 기본이라 주소에 적지 않는다
  if (options.view === "list") params.set("view", "list");
  if (options.category) params.set("category", options.category);
  if (options.added) params.set("added", options.added);
  if (options.deleted) params.set("deleted", options.deleted);
  const query = params.toString();
  return `/my/inventories/${id}${query ? `?${query}` : ""}`;
}

export type ItemPathOptions = {
  // 홈 피드(H-01)에서 왔으면 "home" — 상세가 남의 것 모양(H-02)으로 열리고, 아래에는 피드에서 근처에 있던 것들이 이어진다.
  // 그때 피드의 검색어 · 카테고리도 같이 실어야 같은 줄을 이어 보여줄 수 있다
  from?: "home";
  q?: string | null;
  category?: string | null;
};

// 아이템 상세(M-14 · H-02)의 주소. 아이템은 짐싸기로 인벤토리를 옮겨 다니므로, 주소에 인벤토리를 넣지 않는다
export function itemPath(itemId: string, options: ItemPathOptions = {}) {
  const params = new URLSearchParams();
  if (options.from) params.set("from", options.from);
  if (options.q?.trim()) params.set("q", options.q.trim());
  if (options.category) params.set("category", options.category);
  const query = params.toString();
  return `/items/${itemId}${query ? `?${query}` : ""}`;
}

// 아이템 수정의 주소. 글자 정보를 고친다 (사진을 다듬는 M-07 의 itemEditPath 와 다른 화면이다)
export function itemUpdatePath(itemId: string) {
  return `/items/${itemId}/edit`;
}

// 칸을 누르면 갈 곳. 아이템이면 상세(M-14), 안에 담긴 인벤토리면 그 인벤토리(M-04)
export function slotEntryPath(entry: { kind: "item" | "inventory"; id: string }) {
  return entry.kind === "item" ? itemPath(entry.id) : inventoryPath(entry.id);
}

// 짐싸기(M-05)의 주소. 그 인벤토리가 위쪽에 열린다
export function packingPath(inventoryId: string) {
  return `/my/inventories/${inventoryId}/packing`;
}

// 아이템 정보 입력(M-08)의 주소
export function newItemPath(inventoryId: string) {
  return `/my/inventories/${inventoryId}/items/new`;
}

// 인벤토리 수정의 주소. 이름과 카테고리 태그를 고친다
export function inventoryUpdatePath(inventoryId: string) {
  return `/my/inventories/${inventoryId}/edit`;
}

// 인벤토리 정보 입력의 주소
export const NEW_INVENTORY_PATH = "/my/inventories/new";

// 촬영 화면(M-06)의 주소. 아이템용과 인벤토리용이 따로 있다 — 찍은 뒤에 갈 곳이 다르다
export function itemCameraPath(inventoryId: string) {
  return `/my/inventories/${inventoryId}/items/camera`;
}
export const NEW_INVENTORY_CAMERA_PATH = `${NEW_INVENTORY_PATH}/camera`;

// 사진 편집(M-07)의 주소. 촬영 화면과 같은 이유로 둘이다
export function itemEditPath(inventoryId: string) {
  return `/my/inventories/${inventoryId}/items/edit`;
}
export const NEW_INVENTORY_EDIT_PATH = `${NEW_INVENTORY_PATH}/edit`;
