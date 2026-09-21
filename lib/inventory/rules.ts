// 인벤토리 폼이 쓰는 규칙. 서버와 브라우저 양쪽에서 부른다.
import { MAX_CATEGORIES, MAX_CATEGORY_LENGTH } from "@/lib/categories";

export const INVENTORY_NAME_MAX = 20;

// 태그 하나를 더할 수 있는지 본다. 안 되면 이유를, 되면 null 을 돌려준다
export function categoryError(tag: string, current: readonly string[]) {
  if (!tag) return "카테고리를 입력해 주세요.";
  if (tag.length > MAX_CATEGORY_LENGTH) return `카테고리는 ${MAX_CATEGORY_LENGTH}자까지 쓸 수 있어요.`;
  if (current.includes(tag)) return "이미 있는 카테고리예요.";
  if (current.length >= MAX_CATEGORIES) return `카테고리는 ${MAX_CATEGORIES}개까지 달 수 있어요.`;
  return null;
}

// 서버에서 한 번 더 확인할 때 쓴다. 하나라도 규칙에 어긋나면 null
export function cleanCategories(input: unknown) {
  if (!Array.isArray(input)) return null;
  const tags: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") return null;
    if (categoryError(value.trim(), tags)) return null;
    tags.push(value.trim());
  }
  return tags;
}
