import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LANDING_BAG } from "@/lib/landing/scene";

// 빈 화면의 버튼 · 보조 링크. 주소로 가거나(서버 화면에서) 누르면 할 일을 준다(클라이언트 화면에서)
export type EmptyAction = { label: string; href: string; onClick?: undefined } | { label: string; onClick: () => void; href?: undefined };

// 빈 화면을 그리는 데 필요한 것 — 글 한 문장(많아야 두 문장) · 버튼 하나 · 보조 링크 하나
export type EmptyState = { text: ReactNode; action?: EmptyAction; secondary?: EmptyAction };

// 빈 화면 — 빈 가방 그림 · 한 문장 · 버튼 하나 (무늬 빈화면프로필설계 v01 4-1).
// 그림은 랜딩의 가방 그대로(앞 겹은 안 씀). 글이 뜻을 다 말하므로 그림은 alt 없음.
// 걸러서 0개 · 차단 · 바텀시트 안 · 발견은 가방 없이 글 한 줄만 쓴다(비어 있는 게 아니라서) — 이 부품을 쓰지 않는다.
// 훅이 없어서 서버 화면에도, 클라이언트 화면에도 그대로 놓인다 (onClick 은 클라이언트 화면에서만 줄 수 있다)
export function EmptyBag({ children, action, secondary }: { children: ReactNode; action?: EmptyAction; secondary?: EmptyAction }) {
  return (
    <div className="mt-14 mb-10 flex flex-col items-center px-5 lg:mt-16">
      {/* 화면이 뜨고 0.3초 뒤 한 번 들썩 (globals.css bag-hop). 움직임 줄이기면 없음 */}
      <Image
        src={LANDING_BAG.src}
        alt=""
        width={120}
        height={131}
        unoptimized
        draggable={false}
        className="h-32.75 w-30 origin-bottom select-none object-contain animate-bag-hop motion-reduce:animate-none"
      />
      <p className="mt-5 max-w-[260px] break-keep text-center text-label text-ink-muted">{children}</p>
      {action && (
        <EmptyActionView action={action} className="mt-5 flex h-10 items-center rounded-full bg-ink px-6 text-label font-bold text-white active:opacity-80" />
      )}
      {secondary && <EmptyActionView action={secondary} className="mt-3 text-caption text-ink-muted underline underline-offset-4 active:opacity-60" />}
    </div>
  );
}

function EmptyActionView({ action, className }: { action: EmptyAction; className: string }) {
  if (action.href !== undefined) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={className}>
      {action.label}
    </button>
  );
}

// 가방 없이 글 한 줄 — 걸러서 0개("찾는 아이템이 없어요.") · 차단한 사람 · 바텀시트 안처럼 "비어 있는" 게 아닐 때
export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="mt-16 break-keep px-5 text-center text-label text-ink-muted">{children}</p>;
}
