// "가방이 꽉 찼습니다" / "냉장고가 꽉 찼습니다" — 앞말에 받침이 있으면 "이", 없으면 "가".
// 한글로 끝나지 않는 이름(영어 · 숫자)은 알 수 없어서 "가"로 둔다
export function withSubjectParticle(word: string) {
  const code = word.charCodeAt(word.length - 1);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const hasFinalConsonant = isHangul && (code - 0xac00) % 28 !== 0;
  return `${word}${hasFinalConsonant ? "이" : "가"}`;
}
