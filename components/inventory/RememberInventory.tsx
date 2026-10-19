"use client";

import { useEffect } from "react";
import { LAST_INVENTORY_COOKIE, LAST_INVENTORY_MAX_AGE } from "@/lib/inventory/last-inventory";

// 인벤토리 상세(M-04)를 열면 "마지막에 연 인벤토리"로 적어 둔다 — 하단 탭 가운데 + 가 이 인벤토리의 촬영으로 간다 (app/(flow)/add).
// 서버 컴포넌트는 쿠키를 쓸 수 없어서 브라우저에서 적는다. 그리는 것은 없다
export function RememberInventory({ id }: { id: string }) {
  useEffect(() => {
    document.cookie = `${LAST_INVENTORY_COOKIE}=${id}; path=/; max-age=${LAST_INVENTORY_MAX_AGE}; samesite=lax`;
  }, [id]);
  return null;
}
