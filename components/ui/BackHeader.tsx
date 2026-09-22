"use client";

import { useRouter } from "next/navigation";
import { HeaderMini } from "./HeaderMini";

// 어디서 왔든 "왔던 곳으로" 돌아가는 헤더. 약관처럼 가입 화면에서도 설정에서도 열리는 화면,
// 남의 아이템 상세(H-02)처럼 피드에서도 프로필에서도 열리는 화면에 쓴다.
// 주소를 직접 쳐서 들어와 돌아갈 곳이 없으면 첫 화면으로
export function BackHeader({ title, icon = "back" }: { title: string; icon?: "back" | "close" }) {
  const router = useRouter();
  return <HeaderMini icon={icon} title={title} onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))} />;
}
