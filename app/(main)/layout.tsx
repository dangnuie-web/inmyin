import { Suspense } from "react";
import { BottomTab } from "@/components/ui/BottomTab";
import { WebNav } from "@/components/ui/WebNav";
import { WebNavAccount } from "@/components/ui/WebNavAccount";

// Home · My · Bookmark 공통 틀. 폰은 내용 아래에 하단 탭, 웹(1024px 이상)은 내용 위에 상단 메뉴.
// 로그인·프로필 확인은 여기서 하지 않고 화면마다 requireProfile 로 한다 —
// 레이아웃은 탭을 옮겨 다닐 때 다시 실행되지 않아서 확인이 빠질 수 있다.
// 상단 바의 로그아웃 · 로그인(WebNavAccount)은 Suspense 로 감싸 로그인 여부를 읽는 동안 화면이 기다리지 않게 한다.
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebNav
        account={
          <Suspense fallback={null}>
            <WebNavAccount />
          </Suspense>
        }
      />
      <main className="flex flex-1 flex-col">{children}</main>
      <BottomTab />
    </>
  );
}
