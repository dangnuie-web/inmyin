import { timingSafeEqual } from "node:crypto";

// 예약 실행이 부르는 길(/api/cron/...)의 문지기. 로그인이 없는 길이라 암호로 막는다.
// Vercel Cron 은 "Authorization: Bearer <CRON_SECRET>" 를 실어 GET 으로 부른다. 암호를 안 넣었으면 늘 막힌다
export function cronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
