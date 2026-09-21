// 카테고리는 인벤토리마다 유저가 정하는 자유 태그다. inventories.categories 에 저장한다.
// 여기에는 인벤토리를 만들 때 이름과 기본 태그를 채워주는 추천 4종만 둔다.
// 지름길일 뿐이라, 저장된 뒤에는 직접 쓴 것과 구분하지 않는다.
export const RECOMMENDED_INVENTORIES = [
  { name: "옷장", categories: ["상의", "하의", "신발", "모자", "가방"] },
  { name: "냉장고", categories: ["육류", "야채", "반찬", "냉동", "조미료"] },
  { name: "집", categories: ["거실", "침실", "화장실"] },
  { name: "생활용품", categories: ["청소", "세탁", "소모품"] },
] as const;

// 태그 한도. DB 제약(inventories_categories_check)과 같은 값이어야 한다.
export const MAX_CATEGORIES = 10;
export const MAX_CATEGORY_LENGTH = 10;
