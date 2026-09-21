import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // 설정(M-02)의 "버전 26.09.21". 배포할 때마다 그날의 날짜가 찍힌다 — 이 파일은 빌드할 때 한 번 실행된다
    NEXT_PUBLIC_BUILD_DATE: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }),
  },
};

export default nextConfig;
