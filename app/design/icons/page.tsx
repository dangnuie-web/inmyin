import type { Metadata } from "next";
import { IconPreview } from "./IconPreview";

export const metadata: Metadata = {
  title: "아이콘 미리보기 · INMYIN",
  robots: { index: false },
};

// 홈 화면 앱 아이콘 시안을 폰에서 골라 보는 확인용 페이지. /design 처럼 로그인 없이 열린다 (lib/supabase/proxy.ts)
export default function IconsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-bold">앱 아이콘 미리보기</h1>
        <p className="text-label text-ink-muted">
          시안을 아이폰 홈 화면 모양에 넣어 본다. 폰에서 직접 넣은 그림은 이 브라우저에만 남고 서버에는 올라가지 않는다
        </p>
      </header>
      <IconPreview />
    </main>
  );
}
