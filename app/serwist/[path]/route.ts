import { createSerwistRoute } from "@serwist/turbopack";

// 서비스워커(app/sw.ts)를 esbuild 로 묶어 /serwist/sw.js 주소로 내보내는 통로.
// 빌드할 때 한 번 만들어지고(force-static), .next/static 과 public/ 의 파일 목록이 미리 저장할 목록으로 들어간다.
// 배포마다 달라지는 표식(NEXT_PUBLIC_BUILD_ID)이 /offline 의 버전이 되어, 새로 배포하면 오프라인 화면도 새것으로 바뀐다
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  additionalPrecacheEntries: [{ url: "/offline", revision: process.env.NEXT_PUBLIC_BUILD_ID ?? null }],
  // esbuild-wasm 대신 설치해 둔 esbuild(네이티브)를 쓴다 — 빠르고 Vercel 에서도 잘 돈다
  useNativeEsbuild: true,
  esbuildOptions: {
    // 서비스워커 안에는 .env 가 없어서, 필요한 값을 묶을 때 글자 그대로 박아 넣는다
    define: {
      SUPABASE_ORIGIN: JSON.stringify(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin),
    },
  },
});
