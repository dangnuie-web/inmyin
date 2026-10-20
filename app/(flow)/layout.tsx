import { Suspense } from "react";
import { PageTransition } from "@/components/ui/PageTransition";
import { WebNav } from "@/components/ui/WebNav";
import { WebNavAccount } from "@/components/ui/WebNavAccount";

// 하단 탭이 없는 화면들(상세 · 목록 · 입력 · 설정). 웹에서는 상단 메뉴가 그대로 있다 — 오른쪽 끝 로그아웃 · 로그인도 (main) 과 같게
export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebNav
        account={
          <Suspense fallback={null}>
            <WebNavAccount />
          </Suspense>
        }
      />
      <PageTransition>{children}</PageTransition>
    </>
  );
}
