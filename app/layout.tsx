import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { wantedSans } from "./fonts/wanted-sans";
import { InstallGuideBand } from "@/components/InstallGuide";
import { InstallPromptCatcher } from "@/components/InstallPromptCatcher";
import { Splash, SplashSwitch } from "@/components/Splash";
import { colorToken } from "@/lib/design-tokens";
import { IPHONE_SCREENS, splashFileName } from "@/lib/splash";

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
    // 앱이 뜨는 동안의 그림(스플래시 S-00). 아이폰은 매니페스트로 만들지 않고, 화면 크기가 꼭 맞는 그림만 쓴다 — 기종마다 하나씩.
    // 그림은 app/apple-splash 가 빌드할 때 만든다. 홈 화면에 추가할 때 받아 두는 것이라, 바꾸면 홈 화면 앱을 지우고 다시 추가해야 보인다
    startupImage: IPHONE_SCREENS.map((screen) => ({
      url: `/apple-splash/${splashFileName(screen)}`,
      media: `(device-width: ${screen.width}px) and (device-height: ${screen.height}px) and (-webkit-device-pixel-ratio: ${screen.ratio}) and (orientation: portrait)`,
    })),
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
    // suppressHydrationWarning: 스플래시 스크립트가 React 보다 먼저 html 에 class · style 을 붙인다 (components/Splash.tsx)
    <html lang="ko" className={`${wantedSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* 홈 화면 앱으로 열 때 잠깐 뜨는 화면. 스크립트가 판보다 먼저 와야 판이 그려지기 전에 켤지 정해진다 */}
        <SplashSwitch />
        <Splash />
        {/* 안드로이드 크롬의 설치 신호를 일찍 받아 둔다 — 설치 안내 시트의 "앱 설치" 버튼이 쓴다 (components/InstallGuide.tsx) */}
        <InstallPromptCatcher />
        {/* 아이폰 설치 안내를 따라가는 동안 화면 맨 위에 남는 띠 ("알겠어요"를 누르면 생김, × 나 설치하면 사라짐) */}
        <InstallGuideBand />
        {/* 서비스워커(app/sw.ts) 등록. 개발 중에는 끈다 — 고친 코드가 바로 보여야 하고, 오프라인 동작은 어차피 build + start 로 확인한다 */}
        <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === "development"}>
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
