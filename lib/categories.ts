// 카테고리는 두 가지다 (2026-10-19 당니님 결정 · CLAUDE.md 규칙 4).
//
// 1) 고정 카테고리 — 인벤토리마다 하나, 아래 8개 중에서 고른다. inventories.category.
//    홈 · 발견의 칩 전용이다. 남의 것을 구경할 때 같은 말로 거를 수 있어야 해서 고정이다.
//    담긴(중첩) 인벤토리도 각자 자기 것을 가진다. 기존 인벤토리는 비어 있을 수 있다(null — 한 번 골라 달라고 안내).
// 2) 자유 태그 — 인벤토리마다 유저가 정한다. inventories.categories · items.category.
//    내 인벤토리 안(인벤토리 격자 칩 · 아이템 모아보기 칩 · 정보 입력)에서만 쓴다.

// 순서 = 칩 순서 = 고르는 목록 순서. DB 제약(inventories_category_check) · scripts/demo/lib.mjs 와 같아야 한다
export const FIXED_CATEGORIES = ["가방", "데스크", "파우치", "옷장", "굿즈·수집", "취미", "집·주방", "여행·아웃도어"] as const;

export type FixedCategory = (typeof FIXED_CATEGORIES)[number];

export function isFixedCategory(value: unknown): value is FixedCategory {
  return typeof value === "string" && (FIXED_CATEGORIES as readonly string[]).includes(value);
}

// 인벤토리를 만들 때 이름 · 고정 카테고리 · 기본 태그를 한 번에 채워주는 추천.
// 지름길일 뿐이라, 저장된 뒤에는 직접 쓴 것과 구분하지 않는다
export const RECOMMENDED_INVENTORIES: readonly { name: string; category: FixedCategory; categories: readonly string[] }[] = [
  { name: "가방", category: "가방", categories: ["지갑", "전자기기", "화장품", "소지품"] },
  { name: "데스크", category: "데스크", categories: ["문구", "전자기기", "책", "소품"] },
  { name: "파우치", category: "파우치", categories: ["화장품", "약", "충전기", "위생용품"] },
  { name: "옷장", category: "옷장", categories: ["상의", "하의", "신발", "모자", "가방"] },
  { name: "굿즈", category: "굿즈·수집", categories: ["피규어", "포토카드", "키링", "앨범"] },
  { name: "냉장고", category: "집·주방", categories: ["육류", "야채", "반찬", "냉동", "조미료"] },
  { name: "집", category: "집·주방", categories: ["거실", "침실", "화장실"] },
  { name: "생활용품", category: "집·주방", categories: ["청소", "세탁", "소모품"] },
];

// 태그 한도. DB 제약(inventories_categories_check)과 같은 값이어야 한다.
export const MAX_CATEGORIES = 10;
export const MAX_CATEGORY_LENGTH = 10;
