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
