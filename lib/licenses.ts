// INMYIN 자체의 소스코드. AGPL 인 배경제거 라이브러리를 쓰기 때문에 같은 조건으로 공개한다 (README.md)
export const SOURCE_URL = "https://github.com/dangnuie-web/inmyin";

// 이 앱이 가져다 쓰는 오픈소스와 그 라이선스 (설정 › 오픈소스 라이선스).
// package.json 의 dependencies 와 맞춰 둔다 — 새 라이브러리를 넣거나 빼면 여기도 고친다
export const OPEN_SOURCE_LICENSES = [
  { name: "Next.js", license: "MIT", url: "https://github.com/vercel/next.js" },
  { name: "React", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "Tailwind CSS", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss" },
  { name: "Supabase JS · SSR", license: "MIT", url: "https://github.com/supabase/supabase-js" },
  { name: "Pretendard", license: "SIL OFL 1.1", url: "https://github.com/orioncactus/pretendard" },
  { name: "ONNX Runtime Web", license: "MIT", url: "https://github.com/microsoft/onnxruntime" },
  // AGPL — 그래서 INMYIN 의 소스코드도 공개한다 (SOURCE_URL). 다른 배경제거로 갈아타면 그때 다시 정한다
  { name: "@imgly/background-removal", license: "AGPL-3.0", url: "https://github.com/imgly/background-removal-js" },
  { name: "Serwist", license: "MIT", url: "https://github.com/serwist/serwist" },
  { name: "sharp", license: "Apache-2.0", url: "https://github.com/lovell/sharp" },
  // INMYIN 에디터의 캔버스
  { name: "Konva · react-konva", license: "MIT", url: "https://github.com/konvajs/konva" },
  // 에디터의 스티커 그림 (public/stickers). 그림 파일은 Apache 2.0, 글꼴은 OFL
  { name: "Noto Color Emoji", license: "Apache-2.0", url: "https://github.com/googlefonts/noto-emoji" },
  // 에디터 텍스트의 글꼴 (lib/inmyin/fonts.ts). 구글 폰트에서 받아 우리 서버에서 내보낸다
  { name: "주아 · 도현 · 나눔손글씨 · 개구 · 고운바탕 · Dancing Script · Great Vibes · Pacifico", license: "SIL OFL 1.1", url: "https://fonts.google.com" },
] as const;
