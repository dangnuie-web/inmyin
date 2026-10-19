import localFont from "next/font/local";

// 본문 폰트 Wanted Sans Variable (v1.0.3, 원티드랩 · SIL OFL 1.1 — 옆의 WantedSans-OFL.txt). 2026-10-19 Pretendard 에서 바꿈.
// 가변 1벌(400–1000)을 우리 서버에서 내보낸다. CDN 을 쓰지 않는 까닭:
//   - 사용자의 폰이 다른 회사 서버에 접속하지 않는다 (에디터 글꼴 lib/inmyin/fonts.ts 와 같은 원칙)
//   - 빌드된 파일(_next/static/media)이라 서비스워커가 미리 저장한다 — 오프라인에서도 글꼴이 그대로
// 글자를 빼지 않은 완본(약 1.26MB)이라, 한 번 받으면 어떤 글자를 써도 다시 받을 일이 없다.
// app/layout.tsx 가 html 에 변수(--font-wanted-sans)를 걸고, globals.css 의 --font-sans 가 그 변수를 쓴다
export const wantedSans = localFont({
  src: "./WantedSansVariable.woff2",
  weight: "400 1000",
  style: "normal",
  display: "swap",
  variable: "--font-wanted-sans",
});
