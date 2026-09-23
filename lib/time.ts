import { formatShortDate } from "@/lib/item/rules";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// "방금" · "5분 전" · "3시간 전" · "2일 전", 일주일이 지나면 26.09.23 꼴. 댓글 · 알림의 시각
export function timeAgo(iso: string, now = Date.now()) {
  const elapsed = now - new Date(iso).getTime();
  if (elapsed < MINUTE) return "방금";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}일 전`;
  // 서버는 UTC 로 주므로 한국 날짜로
  return formatShortDate(new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }));
}
