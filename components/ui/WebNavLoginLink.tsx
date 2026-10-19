"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { loginPath } from "@/lib/auth/paths";

// 로그인하면 지금 보던 화면으로 돌아온다(?next=) — 하트 · 팔로우를 눌러 로그인으로 갈 때(useLoginRedirect)와 같은 방식.
// 주소는 화면을 옮길 때마다 바뀌므로 여기(브라우저)에서 읽는다
export function WebNavLoginLink({ className }: { className: string }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return (
    <Link href={loginPath(search ? `${pathname}?${search}` : pathname)} className={className}>
      로그인
    </Link>
  );
}
