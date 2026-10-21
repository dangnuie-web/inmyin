// "온 곳으로 돌아가기" — 같은 화면에 여러 곳에서 들어올 때, 들어온 곳을 주소의 ?back= 에 실어 두고 × · 뒤로 · 저장 뒤에 그리로 보낸다.
// 예: 프로필 띠 + 칸 → 새 인벤토리 만들기(× 는 프로필로), 프로필 안내 줄 "고르기" → 인벤토리 수정(저장하면 그 인벤토리로).
// 주소에 실린 값은 누구나 바꿀 수 있으므로, 이 사이트 안의 경로("/…")만 받는다 — "//남의사이트" · "https:" · 역슬래시는 버린다.
// 실려 온 게 없거나 못 믿으면 null → 화면마다의 기본(인벤토리 관리 등)으로.
// DOM 을 쓰지 않는 순수 함수라 시험(return-to.test.mjs)이 그대로 부른다

export const RETURN_PARAM = "back";
// 주소 길이 상한 — 이 안에 다시 back 이 겹겹이 실리는 일을 막는다
const MAX_LENGTH = 300;
const ORIGIN = "https://inmyin.invalid";

export function safeReturnTo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.length > MAX_LENGTH) return null;
  // 역슬래시 · 공백 · 제어 문자 — 브라우저마다 "/" 로 고쳐 읽어 다른 사이트로 새는 길이 된다
  if (/[\\\s\u0000-\u001f\u007f]/.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value, ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== ORIGIN) return null;
  // 돌아갈 곳에 또 back 이 실려 있으면 뺀다 — 한 칸만 돌아간다
  url.searchParams.delete(RETURN_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

// path 에 돌아갈 곳을 실은 주소. 못 믿는 값이면 path 그대로
export function withReturnTo(path: string, returnTo: string | null | undefined) {
  const safe = safeReturnTo(returnTo);
  if (!safe) return path;
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(RETURN_PARAM, safe);
  return `${base}?${params.toString()}`;
}

// 페이지의 searchParams 에서 꺼낸다 (같은 이름이 여러 번이면 첫 것)
export function returnToFrom(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams[RETURN_PARAM];
  return safeReturnTo(Array.isArray(value) ? value[0] : value);
}
