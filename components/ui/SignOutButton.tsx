"use client";

import { useFormStatus } from "react-dom";
import { signOut } from "@/app/(auth)/actions";
import { forgetThisDevicePush } from "@/lib/push/forget-device";

// 로그아웃 버튼 (설정 · 웹 상단 바). 누르면 먼저 이 기기의 푸시 구독을 풀고(브라우저 + 서버 줄), 그다음 로그아웃.
// 구독 풀기가 실패하거나 늦어도(1.5초) 로그아웃은 그대로 한다 (lib/push/forget-device.ts)
export function SignOutButton({ className, formClassName }: { className: string; formClassName?: string }) {
  async function action() {
    const sw = typeof navigator !== "undefined" && "serviceWorker" in navigator ? navigator.serviceWorker : undefined;
    const endpoint = await forgetThisDevicePush(sw);
    await signOut(endpoint);
  }
  return (
    <form action={action} className={formClassName}>
      <Submit className={className} />
    </form>
  );
}

function Submit({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      로그아웃
    </button>
  );
}
