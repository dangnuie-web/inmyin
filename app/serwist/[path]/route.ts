import { createSerwistRoute } from "@serwist/turbopack";

// 서비스워커(app/sw.ts)를 esbuild 로 묶어 /serwist/sw.js 주소로 내보내는 통로.
// 빌드할 때 한 번 만들어지고(force-static), .next/static 과 public/ 의 파일 목록이 미리 저장할 목록으로 들어간다.
// 배포마다 달라지는 표식(NEXT_PUBLIC_BUILD_ID)이 /offline 의 버전이 되어, 새로 배포하면 오프라인 화면도 새것으로 바뀐다
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  additionalPrecacheEntries: [{ url: "/offline", revision: process.env.NEXT_PUBLIC_BUILD_ID ?? null }],
  // 미리 저장할 파일 — 앞의 둘은 Serwist 의 기본값 그대로. 기본값은 글꼴을 빼서, 본문 글꼴(app/fonts/wanted-sans.ts)만 더한다.
  // 그래야 처음 연 뒤 바로 오프라인이 되어도 글꼴이 그대로다. 글꼴의 기본 저장 규칙(defaultCache)은 4개까지만 두는데,
  // 에디터 글꼴 8종도 같은 칸을 써서 본문 글꼴이 밀려날 수 있다. 파일 이름에 내용 해시가 붙어 있어 바뀔 때만 다시 받는다
  globPatterns: [
    ".next/static/**/*.{js,css,html,ico,apng,png,avif,jpg,jpeg,jfif,pjpeg,pjp,gif,svg,webp,json,webmanifest}",
    "public/**/*",
    ".next/static/media/WantedSansVariable*.woff2",
  ],
  // esbuild-wasm 대신 설치해 둔 esbuild(네이티브)를 쓴다 — 빠르고 Vercel 에서도 잘 돈다
  useNativeEsbuild: true,
  esbuildOptions: {
    // 서비스워커 안에는 .env 가 없어서, 필요한 값을 묶을 때 글자 그대로 박아 넣는다
    define: {
      SUPABASE_ORIGIN: JSON.stringify(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin),
    },
  },
});
