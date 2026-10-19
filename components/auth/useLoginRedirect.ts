"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { loginPath } from "@/lib/auth/paths";

// 로그인 안 한 사람이 하트 · 북마크 · 팔로우 · 댓글을 누르면 부른다 — 로그인 화면으로 보내고, 로그인하면 지금 화면으로 돌아온다
export function useLoginRedirect() {
  const router = useRouter();
  return useCallback(() => {
    router.push(loginPath(window.location.pathname + window.location.search));
  }, [router]);
}
