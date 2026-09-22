/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkOnly, Serwist, type PrecacheEntry, type RuntimeCaching, type SerwistGlobalConfig } from "serwist";

// 서비스워커 — 브라우저 뒤에서 도는 작은 프로그램. 빌드된 파일을 미리 저장해 두고(precache),
// 화면과 그림은 "서버에 먼저 물어보고 실패하면 저장해 둔 것"으로 보여주며(NetworkFirst),
// 인터넷이 완전히 끊기면 /offline 화면을 대신 띄운다.
// app/serwist/[path]/route.ts 가 이 파일을 묶어 /serwist/sw.js 로 내보내고, app/layout.tsx 가 등록한다.
// 개발 중(npm run dev)에는 아무것도 저장하지 않는다 — defaultCache 가 알아서 그렇게 한다.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // 빌드할 때 Serwist 가 미리 저장할 파일 목록을 여기에 채워 넣는다
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// route.ts 의 esbuild define 으로 들어온다. 서비스워커 안에는 .env 가 없다
declare const SUPABASE_ORIGIN: string;

// 저장하지 않을 것들 — 기본 규칙(defaultCache)보다 앞에 둬서 먼저 걸리게 한다
const neverCache: RuntimeCaching[] = [
  // Supabase 로 가는 요청(로그인 · 데이터 · 저장소 API). 남의 데이터가 이 폰에 남으면 안 되고, 항상 최신이어야 한다
  { matcher: ({ url }) => url.origin === SUPABASE_ORIGIN, handler: new NetworkOnly() },
  // 배경제거 AI 모델 파일(수십 MB). 라이브러리가 스스로 저장하므로 두 번 담지 않는다
  { matcher: ({ url }) => url.hostname === "staticimgly.com", handler: new NetworkOnly() },
  // 로그인 콜백(app/auth/callback)은 한 번 쓰고 버리는 주소
  { matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/auth/"), handler: new NetworkOnly() },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // 새 버전이 나오면 기다리지 않고 바로 바꿔 끼운다. 화면은 NetworkFirst 라 옛 화면이 남을 일이 없다
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...neverCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        // 화면(HTML)을 열 수 없을 때만. 그림이나 데이터 요청은 그냥 실패하게 둔다
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
