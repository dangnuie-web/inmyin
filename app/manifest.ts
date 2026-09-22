import type { MetadataRoute } from "next";
import { colorToken } from "@/lib/design-tokens";

// 웹 앱 매니페스트 — 폰이 "홈 화면에 추가"할 때 읽는 앱의 명함. Next.js 가 /manifest.webmanifest 주소로 내보내고
// <link rel="manifest"> 도 알아서 넣는다. 아이콘 파일은 scripts/app-icon.mjs 가 만든다 (npm run app-icon)
export default function manifest(): MetadataRoute.Manifest {
  const white = colorToken("white");

  return {
    name: "INMYIN",
    short_name: "INMYIN",
    description: "내가 가진 것을 사진으로 찍어 가상의 창고에 넣어두고, 한눈에 보고 남에게 보여주는 앱.",
    start_url: "/",
    // 주소창 없이 앱처럼 연다
    display: "standalone",
    orientation: "portrait",
    // 앱이 뜨는 동안의 바탕과 상태 표시줄 색 — 헤더가 흰색이라 맞춘다
    background_color: white,
    theme_color: white,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // 안드로이드가 자기 모양(원 · 둥근 네모)으로 잘라 쓰는 것. 가장자리까지 바탕색이 차 있다
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
