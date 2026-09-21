// 아이템 폼이 쓰는 규칙. 서버와 브라우저 양쪽에서 부른다.

export const ITEM_NAME_MAX = 30;
export const ITEM_DESCRIPTION_MAX = 300;
export const ITEM_QUANTITY_MAX = 999;
// DB의 items_acquired_note_length 제약과 같아야 한다
export const ACQUIRED_NOTE_MAX = 20;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// 달력이 주는 "2026-09-22" 꼴인지, 실제로 있는 날짜인지
export function isDateValue(value: string) {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

// "2026-09-22" → "26.09.22". 화면에 보여주는 꼴
export function formatShortDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year.slice(2)}.${month}.${day}`;
}

// 아이템의 글자 정보. 등록(M-08)과 수정이 같은 것을 받는다
export type ItemFieldsInput = {
  name: string;
  description: string;
  // 이 인벤토리의 태그 중 하나, 또는 새로 쓴 태그. 고르지 않았으면 null
  category: string | null;
  quantity: number;
  // "20살 생일" 같은 말이나 "26.09.22" 같은 날짜 글자
  acquiredNote: string;
  // 달력이 주는 "2026-09-22" 꼴. 없으면 빈 글자
  expiresAt: string;
  isPublic: boolean;
};

// 브라우저가 보낸 값을 믿지 않고 서버에서 한 번 더 다듬고 검사한다. 문제가 있으면 error
export function cleanItemFields(input: ItemFieldsInput) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "아이템 이름을 입력해 주세요." };
  if (name.length > ITEM_NAME_MAX) return { error: `아이템 이름은 ${ITEM_NAME_MAX}자까지 쓸 수 있어요.` };

  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!description) return { error: "설명을 입력해 주세요." };
  if (description.length > ITEM_DESCRIPTION_MAX) return { error: `설명은 ${ITEM_DESCRIPTION_MAX}자까지 쓸 수 있어요.` };

  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > ITEM_QUANTITY_MAX) {
    return { error: `개수는 1부터 ${ITEM_QUANTITY_MAX}까지 넣을 수 있어요.` };
  }

  const acquiredNote = typeof input.acquiredNote === "string" ? input.acquiredNote.trim() : "";
  if (acquiredNote.length > ACQUIRED_NOTE_MAX) return { error: `획득날짜는 ${ACQUIRED_NOTE_MAX}자까지 쓸 수 있어요.` };

  if (input.expiresAt && !isDateValue(input.expiresAt)) return { error: "유통기한을 다시 골라 주세요." };

  return {
    fields: {
      name,
      description,
      category: typeof input.category === "string" && input.category.trim() ? input.category.trim() : null,
      quantity: input.quantity,
      acquired_note: acquiredNote || null,
      expires_at: input.expiresAt || null,
      is_public: input.isPublic === true,
    },
  };
}
