// 가입할 때 받는 약관 동의 항목. 항목을 늘리거나 문구를 바꿀 때는 여기만 고친다.
// href 가 있으면 항목 옆에 "보기" 링크가 붙는다 (/terms, /privacy)
export const TERMS = [
  { id: "service", label: "이용약관 동의", required: true, href: "/terms" },
  { id: "privacy", label: "개인정보 수집·이용 동의", required: true, href: "/privacy" },
  { id: "marketing", label: "마케팅 정보 수신 동의", required: false },
] as const;

export type TermId = (typeof TERMS)[number]["id"];

// 폼에서 체크박스 name 으로 쓴다
export function termFieldName(id: TermId) {
  return `term_${id}`;
}
