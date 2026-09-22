import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "오프라인 · INMYIN",
  robots: { index: false },
};

// 인터넷이 끊겨서 화면을 못 열 때 서비스워커(app/sw.ts)가 대신 보여주는 화면.
// 빌드할 때 미리 저장되므로 (app/serwist/[path]/route.ts) 서버 없이 뜬다 — 그래서 로그인 정보도, 데이터도 안 쓴다.
// 로그인 없이 열리는 주소다 (lib/supabase/proxy.ts) — 로그인 화면으로 돌려보내면 미리 저장할 때 엉뚱한 화면이 담긴다
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-8 px-8 pb-10 pt-20 text-center">
      <Image src="/logo.svg" alt="INMYIN" width={146} height={31} priority />
      <div className="flex flex-col gap-2">
        <h1 className="text-title font-bold">인터넷이 연결되어 있지 않아요</h1>
        <p className="text-body text-ink-muted">연결되면 다시 시도해 주세요. 저장해 둔 내 물건은 그대로 있어요.</p>
      </div>
      {/* Link 가 아니라 a — 서비스워커를 거치는 진짜 새 요청이어야 연결됐는지 다시 확인한다 */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="flex h-14 w-full items-center justify-center rounded-md bg-ink text-body font-semibold text-white">
        다시 시도
      </a>
    </main>
  );
}
