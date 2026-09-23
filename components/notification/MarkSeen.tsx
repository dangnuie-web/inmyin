"use client";

import { useEffect } from "react";
import { markNotificationsSeen } from "@/app/(main)/notifications/actions";

// 알림 화면이 그려지면 한 번 "여기까지 봤다"고 서버에 적는다. 그리는 것은 없다
export function MarkSeen() {
  useEffect(() => {
    markNotificationsSeen();
  }, []);
  return null;
}
