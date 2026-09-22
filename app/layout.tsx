import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { colorToken } from "@/lib/design-tokens";

export const metadata: Metadata = {
  applicationName: "INMYIN",
  title: "INMYIN",
  description:
    "내가 가진 것을 사진으로 찍어 가상의 창고에 넣어두고, 한눈에 보고 남에게 보여주는 앱.",
  // 아이폰은 표준 매니페스트만으로는 부족하다. 이 애플 전용 태그가 있어야 "홈 화면에 추가"한 뒤 주소창 없이 열린다
  appleWebApp: {
    capable: true,
    title: "INMYIN",
    // 상태 표시줄(시계 줄)을 흰 바탕에 검은 글자로. 화면은 그 아래부터 시작한다
    statusBarStyle: "default",
  },
  // 아이폰 홈 화면 아이콘 (scripts/app-icon.mjs 가 만든다). 파일 방식(app/apple-icon.png)과 코드 방식을 섞으면
  // Next.js 가 파일 쪽을 무시하므로, 아이콘은 모두 코드 방식으로 적는다. favicon.ico 만은 특별 취급이라 파일 그대로
  icons: { apple: "/icons/apple-touch-icon.png" },
  // 숫자를 전화번호로 착각해 링크로 만들지 않게
  formatDetection: { telephone: false },
};

// 화면을 아이폰 홈 막대 아래까지 넓힌다. 이게 있어야 하단 탭이
// env(safe-area-inset-bottom) 으로 홈 막대만큼의 여백을 알아낼 수 있다.
export const viewport: Viewport = {
  viewportFit: "cover",
  // 브라우저 테두리 색 — 매니페스트의 theme_color 와 같은 값
  themeColor: colorToken("white"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* 서비스워커(app/sw.ts) 등록. 개발 중에는 끈다 — 고친 코드가 바로 보여야 하고, 오프라인 동작은 어차피 build + start 로 확인한다 */}
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
