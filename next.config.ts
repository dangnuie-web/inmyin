import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 한 번 연 화면(서버에서 그리는 화면)을 30초 동안 폰 메모리에 두고 다시 쓴다 — 탭을 왔다 갔다 할 때 서버를 다시 기다리지 않는다.
    // 기본은 0초(매번 새로). 저장 · 지우기 같은 서버 동작(revalidatePath)이나 로그아웃(쿠키 바뀜)이 있으면 바로 비워진다.
    // 남이 올린 새 아이템은 최대 30초 늦게 보일 수 있다
    staleTimes: { dynamic: 30 },
  },
  env: {
    // 설정(M-02)의 "버전 26.09.21". 배포할 때마다 그날의 날짜가 찍힌다 — 이 파일은 빌드할 때 한 번 실행된다
    NEXT_PUBLIC_BUILD_DATE: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }),
    // 배포마다 달라지는 짧은 표식. 이름은 그대로인 채 내용만 바뀌는 파일(아이콘 시안 PNG 등)의 주소 뒤에 붙여서,
    // 브라우저가 기억해 둔 옛 그림을 계속 보여주지 않게 한다. Vercel 이 주는 커밋 번호를 쓰고, 내 컴퓨터에서는 시각으로 대신한다
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? String(Date.now()),
  },
};

// 서비스워커(app/sw.ts)를 묶는 esbuild 를 서버 번들 밖에 두게 한다 — Serwist 의 Turbopack 연동에 필요한 전부
export default withSerwist(nextConfig);
