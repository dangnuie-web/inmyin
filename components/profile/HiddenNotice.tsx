"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Toast } from "@/components/ui/Toast";

// 남의 인벤토리 주소로 왔는데 볼 수 없을 때(비공개 · 지워짐 · 없음) 프로필로 보내며 붙인 ?notice=hidden 을 읽어
// 토스트 한 번 띄우고 주소에서 지운다 — 새로고침해도 다시 안 뜬다 (무늬 빈화면프로필설계 v01 7절).
// 비공개인지 지워졌는지는 구분하지 않는다 — 구분하면 "있다"는 것이 샌다
export function HiddenNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const hide = useCallback(() => setMessage(null), []);

  useEffect(() => {
    if (searchParams.get("notice") !== "hidden") return;
    // 주소에서 지우는 것과 함께 띄운다 — 지운 뒤에는 이 효과가 다시 돌아도 아무것도 안 한다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage("지금은 볼 수 없는 인벤토리예요.");
    const params = new URLSearchParams(searchParams);
    params.delete("notice");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return <Toast message={message} onDone={hide} />;
}
