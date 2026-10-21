import { timingSafeEqual } from "node:crypto";
import { sendExpiryNotices } from "@/lib/push/expiry";

// 유통기한 임박 알림을 보내는 길. 하루 한 번 예약 실행이 부른다 (아직 예약은 없다 — 로드맵 4단계).
// Vercel Cron 은 "Authorization: Bearer <CRON_SECRET>" 를 실어 GET 으로 부른다. 암호가 맞을 때만 돈다.
// 같은 날 여러 번 불려도 기기마다 한 번만 보낸다 (lib/push/expiry.ts)

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await sendExpiryNotices();
  return Response.json(result);
}
