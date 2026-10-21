// 웹 푸시의 글자 · 종류 · 날짜 계산. 서버(lib/push/send.ts 등)와 서비스워커(app/sw.ts)가 같이 쓴다.
// 다른 파일을 불러오지 않는 순수 함수만 둔다 — 시험(messages.test.mjs)이 그대로 부르고, 서비스워커에도 그대로 묶인다

// 받을 종류. DB push_subscriptions.kinds 의 허용 값과 같다
export const PUSH_KINDS = ["follow", "heart", "comment", "expiry"] as const;
export type PushKind = (typeof PUSH_KINDS)[number];

// 설정 › 알림에 보이는 이름 (위에서부터 이 순서)
export const PUSH_KIND_LABELS: Record<PushKind, string> = {
  follow: "팔로우",
  heart: "하트",
  comment: "댓글",
  expiry: "유통기한 임박",
};

export function isPushKind(value: unknown): value is PushKind {
  return typeof value === "string" && (PUSH_KINDS as readonly string[]).includes(value);
}

// 고른 종류만 남기고, 정해진 순서로, 겹친 것은 하나로
export function cleanKinds(value: unknown): PushKind[] {
  if (!Array.isArray(value)) return [];
  return PUSH_KINDS.filter((kind) => value.includes(kind));
}

// ── 유통기한 ──────────────────────────────────────────────────

// 유통기한 며칠 전에 알릴까. 0 이면 당일에만. 당니님이 바꿔도 되는 숫자
export const EXPIRY_NOTICE_DAYS = 3;

// 한국 날짜 "YYYY-MM-DD". 서버는 UTC 로 돌아서 그냥 날짜를 읽으면 아침 9시 전엔 어제가 된다
export function seoulDate(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// "YYYY-MM-DD" 에 며칠 더하기
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

// 오늘 알릴 물건의 유통기한 범위 [from, to]. 오늘 이미 살폈으면 null.
// 지난번에 살핀 날(sentOn)까지 알린 범위 다음부터 오늘의 범위 끝까지 — 같은 물건은 한 번만, 하루 빠져도 다음 날 몰아서 알린다.
// 처음이면(sentOn 없음) 오늘부터 남은 며칠 안의 것을 모두
export function expiryWindow(today: string, sentOn: string | null, days = EXPIRY_NOTICE_DAYS): { from: string; to: string } | null {
  if (sentOn && sentOn >= today) return null;
  const to = addDays(today, days);
  const from = sentOn ? addDays(sentOn, days + 1) : today;
  // 오래 쉬었다 돌아와도 이미 지난 것은 알리지 않는다
  return { from: from < today ? today : from, to };
}

// ── 보낼 글 ───────────────────────────────────────────────────

// 서버가 보내고 서비스워커가 받아 띄우는 내용
export type PushPayload = {
  title: string;
  body: string;
  // 누르면 열 앱 안의 주소
  url: string;
  // 같은 tag 의 알림은 쌓이지 않고 바뀌어 끼워진다 — 하트를 껐다 켰다 해도 알림 하나
  tag: string;
};

const TITLE = "INMYIN";
// 댓글 미리보기 글자 수 (알림 화면 NotificationRow 와 같다)
export const COMMENT_PREVIEW = 40;

function preview(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > COMMENT_PREVIEW ? `${flat.slice(0, COMMENT_PREVIEW)}…` : flat;
}

type Actor = { id: string; nickname: string };
type Target = { kind: "item" | "post"; id: string };

function what(target: Target) {
  return target.kind === "item" ? "아이템" : "INMYIN";
}

// 문구는 알림 화면(components/notification/NotificationRow.tsx)과 같게
export function followMessage(actor: Actor, url: string): PushPayload {
  return { title: TITLE, body: `${actor.nickname}님이 회원님을 팔로우하기 시작했어요`, url, tag: `follow:${actor.id}` };
}

export function heartMessage(actor: Actor, target: Target, url: string): PushPayload {
  return { title: TITLE, body: `${actor.nickname}님이 회원님의 ${what(target)}에 하트를 눌렀어요`, url, tag: `heart:${actor.id}:${target.id}` };
}

export function commentMessage(actor: Actor, target: Target, body: string, commentId: string, url: string): PushPayload {
  return { title: TITLE, body: `${actor.nickname}님이 회원님의 ${what(target)}에 댓글을 남겼어요: ${preview(body)}`, url, tag: `comment:${commentId}` };
}

function dueText(today: string, expiresAt: string) {
  const left = daysBetween(today, expiresAt);
  return left <= 0 ? "오늘까지예요" : `${left}일 남았어요`;
}

// 하루에 한 번, 알릴 물건을 묶어서 한 통. items 는 유통기한이 빠른 순.
// 하나면 그 아이템으로, 여럿이면 내 아이템 모아보기로 간다
export function expiryMessage(items: { id: string; name: string; expiresAt: string }[], today: string, urls: { item: (id: string) => string; list: string }): PushPayload | null {
  if (items.length === 0) return null;
  const [first] = items;
  const body =
    items.length === 1
      ? `${first.name}의 유통기한이 ${dueText(today, first.expiresAt)}`
      : `${first.name} 외 ${items.length - 1}개의 유통기한이 다가와요`;
  return { title: TITLE, body, url: items.length === 1 ? urls.item(first.id) : urls.list, tag: `expiry:${today}` };
}

// ── 받는 쪽 (서비스워커) ──────────────────────────────────────

// 이 사이트 안의 경로("/…")만. 푸시 내용은 우리 서버가 만들지만, 잠금이 풀린 셈 치고 한 번 더 거른다
export function safeAppPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.length > 300) return null;
  if (/[\\\s\u0000-\u001f\u007f]/.test(value)) return null;
  return value;
}

// 받은 내용을 띄울 수 있는 꼴로. 깨졌으면 알림 화면으로 가는 기본 알림
export function readPushPayload(raw: unknown): PushPayload {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (value: unknown, fallback: string) => (typeof value === "string" && value.trim() ? value.slice(0, 300) : fallback);
  return {
    title: text(data.title, TITLE),
    body: text(data.body, "새 알림이 있어요"),
    url: safeAppPath(data.url) ?? "/notifications",
    tag: text(data.tag, "inmyin"),
  };
}

// 이 응답이면 그 구독은 끊긴 것 — 지운다 (404 없는 주소, 410 사라짐)
export function isGoneStatus(status: unknown): boolean {
  return status === 404 || status === 410;
}
