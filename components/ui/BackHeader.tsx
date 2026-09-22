"use client";

import { useRouter } from "next/navigation";
import { HeaderMini } from "./HeaderMini";

// 어디서 왔든 "왔던 곳으로" 돌아가는 헤더. 약관처럼 가입 화면에서도 설정에서도 열리는 화면에 쓴다.
// 주소를 직접 쳐서 들어와 돌아갈 곳이 없으면 첫 화면으로
export function BackHeader({ title }: { title: string }) {
  const router = useRouter();
  return <HeaderMini icon="back" title={title} onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))} />;
}
