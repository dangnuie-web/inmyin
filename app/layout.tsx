import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "INMYIN",
  description:
    "내가 가진 것을 사진으로 찍어 가상의 창고에 넣어두고, 한눈에 보고 남에게 보여주는 앱.",
};

// 화면을 아이폰 홈 막대 아래까지 넓힌다. 이게 있어야 하단 탭이
// env(safe-area-inset-bottom) 으로 홈 막대만큼의 여백을 알아낼 수 있다.
export const viewport: Viewport = {
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
