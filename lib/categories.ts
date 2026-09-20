// 인벤토리 종류별 고정 카테고리. 유저는 카테고리를 만들지 않는다.
// custom 인벤토리는 카테고리가 없고, 그 안의 아이템은 category 가 null 이다.
export const CATEGORIES = {
  closet: ["상의", "하의", "신발", "모자", "가방"],
  fridge: ["고기", "야채", "반찬", "냉동", "조미료"],
  home: ["거실", "침실", "화장실"],
  supplies: ["청소", "세탁", "소모품"],
  custom: [],
} as const;

export type InventoryKind = keyof typeof CATEGORIES;
export type Category = (typeof CATEGORIES)[InventoryKind][number];

// 새 인벤토리를 만들 때 먼저 보여주는 추천 4종.
// Home · Like 탭 카테고리 필터의 상위 묶음이기도 하다.
export const RECOMMENDED_INVENTORIES = [
  { kind: "closet", name: "옷장" },
  { kind: "fridge", name: "냉장고" },
  { kind: "home", name: "집" },
  { kind: "supplies", name: "생활용품" },
] as const satisfies readonly { kind: InventoryKind; name: string }[];
