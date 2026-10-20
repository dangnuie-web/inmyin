"use client";

import { useLinkStatus } from "next/link";

// 눌린 Link 가 서버의 답을 기다리는 동안만 보이지 않는 표식 하나를 남긴다 — <Link> 안에 넣는다.
// 뼈대 화면(loading.tsx)이 없는 전환(프로필 탭 줄 · 인벤토리 띠 · 보기 토글 · 칩)은 주소가 바뀔 때까지 화면이 그대로라
// 폰에서 "안 눌렸나?" 싶었다. 표식이 생기면 CSS(:has)가 누른 것을 먼저 고른 모양으로, 아래 몸통을 흐리게 바꾼다 (app/globals.css "누르자마자")
// scope — 어느 묶음의 몸통을 흐리게 할지. [data-pending-scope=scope] 안의 [data-pending-body=scope] 가 흐려진다
export function LinkPending({ scope }: { scope: string }) {
  const { pending } = useLinkStatus();
  return pending ? <span hidden data-link-pending={scope} /> : null;
}
