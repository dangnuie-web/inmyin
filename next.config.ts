import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // 설정(M-02)의 "버전 26.09.21". 배포할 때마다 그날의 날짜가 찍힌다 — 이 파일은 빌드할 때 한 번 실행된다
    NEXT_PUBLIC_BUILD_DATE: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }),
    // 배포마다 달라지는 짧은 표식. 이름은 그대로인 채 내용만 바뀌는 파일(아이콘 시안 PNG 등)의 주소 뒤에 붙여서,
    // 브라우저가 기억해 둔 옛 그림을 계속 보여주지 않게 한다. Vercel 이 주는 커밋 번호를 쓰고, 내 컴퓨터에서는 시각으로 대신한다
    NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? String(Date.now()),
  },
};

export default nextConfig;
