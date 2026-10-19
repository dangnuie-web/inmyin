"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import {
  AUTO_DELAY_MS,
  autoAllowed,
  BAND_EVENT,
  bandHiddenOn,
  bandPanelFor,
  bandSteps,
  canAutoGuide,
  canGuide,
  type ChipIcon,
  type CloseReason,
  copiedNotice,
  COPY_FAILED_NOTICE,
  currentInstallEnv,
  DIM_FADE_MS,
  forgetInstallPrompt,
  type GuideAction,
  guideContent,
  hideBand,
  type InstallEnv,
  installPrompt,
  kakaoOpenExternalUrl,
  PROMPT_EVENT,
  readBand,
  readRecord,
  recordClose,
  SESSION_KEY,
  SHEET_EASE,
  SHEET_SLIDE_MS,
  SHELF_ICON_DELAY_MS,
  SHELF_NAME_DELAY_MS,
  showBand,
  type StepPart,
  SWIPE_CLOSE_PX,
} from "@/lib/install-guide";

// 설치 안내 — 아이폰은 설치 배너가 없어서 "공유 → 홈 화면에 추가"를 알려 주는 바텀시트.
// 판별 · 규칙 · 문구는 lib/install-guide.ts. 여기엔 그리는 것과 누르는 것만 있다
//   InstallGuideAuto         인벤토리 상세 — 아이템을 저장하고 돌아온 직후 자동으로 (최대 2번)
//   InstallGuideSettingsRow  설정 › 일반 › "홈 화면에 추가" — 언제든

// ── 자동 (인벤토리 상세) ──────────────────────────────────────────

// addedId — 방금 저장한 아이템. 주소의 ?added= 는 2.5초 뒤 지워지지만, 한 번 뜬 시트는 그대로 둔다
export function InstallGuideAuto({ addedId }: { addedId: string | null }) {
  const [env, setEnv] = useState<InstallEnv | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (!addedId) return;
    const timer = setTimeout(() => {
      const current = currentInstallEnv();
      if (!canAutoGuide(current) || !autoAllowed(readRecord()) || shownThisSession() || screenBusy()) return;
      markShownThisSession();
      setEnv(current);
    }, AUTO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [addedId]);

  return (
    <>
      {env && (
        <InstallGuideSheet
          env={env}
          countsAsAuto
          onClosed={(message) => {
            setEnv(null);
            if (message) setNotice(message);
          }}
        />
      )}
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}

function shownThisSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markShownThisSession() {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // 못 적으면 이 탭에서 한 번 더 뜰 수 있다 — 횟수 기록(localStorage)이 따로 막는다
  }
}

// 다른 시트 · 모달 · 메뉴 · 토스트가 이미 떠 있으면 이번엔 건너뛴다 (다음 저장 때 다시 판단)
function screenBusy() {
  return document.querySelector('[role="dialog"], [role="menu"], [role="status"]') !== null;
}

// ── 설정 줄 ─────────────────────────────────────────────────────

// 판별 결과는 브라우저에서만 안다. 서버가 그린 HTML 에는 줄이 없고, 뜬 뒤에 보일지 정한다.
// 안드로이드의 설치 신호는 늦게 올 수 있어서 그 소식도 듣는다
function subscribeEnv(onChange: () => void) {
  window.addEventListener(PROMPT_EVENT, onChange);
  return () => window.removeEventListener(PROMPT_EVENT, onChange);
}
// useSyncExternalStore 는 같은 값이면 같은 것을 돌려받아야 해서 글자로 줄여 비교한다
function envKey() {
  return JSON.stringify(currentInstallEnv());
}

export function InstallGuideSettingsRow({ className }: { className: string }) {
  const key = useSyncExternalStore(subscribeEnv, envKey, () => null);
  const [open, setOpen] = useState<InstallEnv | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  const env: InstallEnv | null = key ? JSON.parse(key) : null;
  if (!env || !canGuide(env)) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(currentInstallEnv())} className={className}>
        홈 화면에 추가
      </button>
      {open && (
        <InstallGuideSheet
          env={open}
          onClosed={(message) => {
            setOpen(null);
            if (message) setNotice(message);
          }}
        />
      )}
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}

// ── 시트 ───────────────────────────────────────────────────────

type Phase = "enter" | "open" | "leave";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// 아래에서 올라오는 판 (설계서 3절 A안). 닫히면 onClosed — 띄울 안내(토스트)가 있으면 같이 넘긴다.
// countsAsAuto — 자동으로 뜬 시트만 닫을 때 자동 횟수에 센다. 설정에서 직접 연 것은 세지 않는다 (2026-10-19 당니님 결정).
// "다시 보지 않기" · 설치함은 어디서 열었든 적는다
function InstallGuideSheet({
  env,
  countsAsAuto = false,
  onClosed,
}: {
  env: InstallEnv;
  countsAsAuto?: boolean;
  onClosed: (notice: string | null) => void;
}) {
  const content = guideContent(env);
  const [phase, setPhase] = useState<Phase>("enter");
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const busy = useRef(false);

  // 올라오기. 한 프레임은 내려간 채로 그려야 미끄러지는 게 보인다
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPhase("open"));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  // 초점은 제목으로. 닫히면 원래 있던 자리로 돌려준다
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    titleRef.current?.focus({ preventScroll: true });
    return () => before?.focus?.({ preventScroll: true });
  }, []);

  const close = useCallback(
    (reason: CloseReason, notice: string | null = null) => {
      if (busy.current) return;
      busy.current = true;
      if (reason === "never" || countsAsAuto) recordClose(reason);
      setPhase("leave");
      setTimeout(() => onClosed(notice), prefersReducedMotion() ? 0 : SHEET_SLIDE_MS);
    },
    [countsAsAuto, onClosed],
  );

  async function run(action: GuideAction) {
    if (busy.current) return;
    switch (action) {
      case "ok":
      case "later":
        return close("dismissed");
      case "okBand": {
        // 판이 내려가는 동안 위쪽에 띠가 생긴다 — 사파리 메뉴를 누르는 동안 단계를 보고 따라간다
        const panel = bandPanelFor(env);
        if (panel) showBand(panel);
        return close("dismissed");
      }
      case "never":
        return close("never");
      case "install": {
        const prompt = installPrompt();
        if (!prompt) return close("dismissed");
        // 크롬의 설치 창. 설치하면 다시 안 띄우고, 취소하면 "나중에"와 같다
        busy.current = true;
        try {
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          forgetInstallPrompt();
          busy.current = false;
          return close(outcome === "accepted" ? "never" : "dismissed");
        } catch {
          forgetInstallPrompt();
          busy.current = false;
          return close("dismissed");
        }
      }
      case "openExternal":
        window.location.href = kakaoOpenExternalUrl(shareableUrl());
        return close("handoff");
      case "copy":
        try {
          await navigator.clipboard.writeText(shareableUrl());
          return close("handoff", copiedNotice(env));
        } catch {
          return close("handoff", COPY_FAILED_NOTICE);
        }
    }
  }

  // Esc 로 닫기, Tab 은 시트 안에서만 돈다
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      return close("dismissed");
    }
    if (event.key !== "Tab" || !sheetRef.current) return;
    const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>("button"));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // 아래로 쓸어 닫기. 끄는 동안은 손가락을 따라오고, 놓았을 때 충분히 내려왔으면 닫는다
  const drag = useRef<{ startY: number; dy: number } | null>(null);
  function onTouchStart(event: React.TouchEvent) {
    if (phase !== "open") return;
    drag.current = { startY: event.touches[0].clientY, dy: 0 };
  }
  function onTouchMove(event: React.TouchEvent) {
    const sheet = sheetRef.current;
    if (!drag.current || !sheet) return;
    drag.current.dy = Math.max(0, event.touches[0].clientY - drag.current.startY);
    sheet.style.transition = "none";
    sheet.style.transform = `translateY(${drag.current.dy}px)`;
  }
  function onTouchEnd() {
    const sheet = sheetRef.current;
    const dy = drag.current?.dy ?? 0;
    drag.current = null;
    if (!sheet) return;
    sheet.style.transition = "";
    sheet.style.transform = "";
    if (dy >= SWIPE_CLOSE_PX) close("dismissed");
  }

  const shown = phase === "open";

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end" onKeyDown={onKeyDown}>
      {/* 딤 — 누르면 닫힘 */}
      <button
        type="button"
        aria-label="닫기"
        tabIndex={-1}
        onClick={() => close("dismissed")}
        className={`absolute inset-0 cursor-default bg-ink/40 transition-opacity motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDuration: `${DIM_FADE_MS}ms` }}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-guide-title"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        className={`relative mx-auto w-full max-w-md rounded-t-lg bg-white px-5 pt-7 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.5rem))] transition-transform motion-reduce:transition-none ${shown ? "translate-y-0" : "translate-y-full"}`}
        style={{ transitionDuration: `${SHEET_SLIDE_MS}ms`, transitionTimingFunction: SHEET_EASE }}
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={() => close("dismissed")}
          className="absolute top-1.5 right-1.5 flex size-11 items-center justify-center text-ink active:opacity-60"
        >
          <Icon name="close" scale={44 / 64} />
        </button>

        {content.shelf && <Shelf />}

        <h2 id="install-guide-title" ref={titleRef} tabIndex={-1} className="text-title font-bold break-keep outline-none">
          {content.title}
        </h2>
        <p className="mt-1.5 text-label text-ink-muted break-keep">{content.body}</p>

        {content.steps && (
          <ol className="mt-5 flex flex-col gap-1">
            {content.steps.map((step, index) => (
              <li key={index} className="flex min-h-10 items-center gap-3 text-label">
                <span className="flex size-5.5 flex-none items-center justify-center rounded-full border-[1.5px] border-ink text-[12px] leading-none font-bold">
                  {index + 1}
                </span>
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  {step.map((part, partIndex) => (
                    <StepPiece key={partIndex} part={part} />
                  ))}
                </span>
              </li>
            ))}
          </ol>
        )}
        {content.note && <p className="mt-2 ml-[34px] text-caption text-ink-muted break-keep">{content.note}</p>}

        <div className="mt-6 flex flex-col gap-2.5">
          {content.primary && (
            <SheetButton variant="primary" onClick={() => run(content.primary!.action)}>
              {content.primary.label}
            </SheetButton>
          )}
          {content.secondary && (
            <SheetButton variant="outline" onClick={() => run(content.secondary!.action)}>
              {content.secondary.label}
            </SheetButton>
          )}
          {content.quiet && (
            <button type="button" onClick={() => run(content.quiet!.action)} className="h-10 text-caption text-ink-muted active:opacity-60">
              {content.quiet.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 랜딩의 "가입 · 로그인"(검정) · "유저 인벤토리 보기"(외곽선)와 같은 모양
function SheetButton({ variant, onClick, children }: { variant: "primary" | "outline"; onClick: () => void; children: ReactNode }) {
  const look =
    variant === "primary" ? "bg-ink text-white active:opacity-80" : "border-2 border-ink bg-white text-ink active:opacity-60";
  return (
    <button type="button" onClick={onClick} className={`flex h-14 w-full items-center justify-center rounded-full text-body font-bold ${look}`}>
      {children}
    </button>
  );
}

// 칸 그림 — 홈 화면 한 줄을 인벤토리 칸으로. 빈 칸 셋 사이, 셋째 칸에 INMYIN 이 "톡" 꽂힌다
function Shelf() {
  return (
    <div aria-hidden className="mb-[22px] flex justify-center gap-3.5">
      {[0, 1, 2, 3].map((cell) => (
        <div key={cell} className="flex w-14 flex-col items-center gap-1.5">
          {cell === 2 ? (
            <>
              <Image
                src="/icons/apple-touch-icon.png"
                alt=""
                width={56}
                height={56}
                className="size-14 rounded-[13px] animate-slot-pop motion-reduce:animate-none"
                style={{ animationDelay: `${SHELF_ICON_DELAY_MS}ms` }}
              />
              <span
                className="h-[11px] text-[11px] leading-none animate-fade-in motion-reduce:animate-none"
                style={{ animationDelay: `${SHELF_NAME_DELAY_MS}ms` }}
              >
                INMYIN
              </span>
            </>
          ) : (
            <>
              <div className="size-14 rounded-[13px] bg-gray-2" />
              <span className="h-[11px]" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function StepPiece({ part }: { part: StepPart }) {
  if (typeof part === "string") return <span>{part}</span>;
  return (
    <span
      className={`inline-flex h-7 items-center gap-1 rounded-sm bg-gray-2 text-[14px] font-semibold whitespace-nowrap ${part.chip ? "px-[9px]" : "px-1.5"}`}
    >
      {part.icon && <ChipGlyph name={part.icon} />}
      {part.chip}
    </span>
  );
}

// 칩 아이콘 — 시안 HTML 의 G.share · G.more · G.plus 를 옮긴 직접 그린 그림 (애플 SF Symbols 아님).
// moreVertical 은 안드로이드 크롬의 ⋮ 메뉴 — more 의 점 셋을 세로로 세운 것
function ChipGlyph({ name }: { name: ChipIcon }) {
  const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const glyphs: Record<ChipIcon, ReactNode> = {
    share: (
      <g {...line}>
        <path d="M8.5 9.5H6.5V20H17.5V9.5H15.5" />
        <path d="M12 3.5V14" />
        <path d="M8.5 7L12 3.5L15.5 7" />
      </g>
    ),
    more: (
      <g fill="currentColor">
        <circle cx="5.5" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="18.5" cy="12" r="1.7" />
      </g>
    ),
    moreVertical: (
      <g fill="currentColor">
        <circle cx="12" cy="5.5" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="12" cy="18.5" r="1.7" />
      </g>
    ),
    plus: (
      <g {...line}>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <path d="M12 8.5V15.5M8.5 12H15.5" />
      </g>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      {glyphs[name]}
    </svg>
  );
}

// 다른 브라우저로 넘길 주소. 방금 저장한 표시(?added=)는 빼고 넘긴다
function shareableUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("added");
  return url.toString();
}

// ── 안내 띠 ─────────────────────────────────────────────────────

function subscribeBand(onChange: () => void) {
  window.addEventListener(BAND_EVENT, onChange);
  return () => window.removeEventListener(BAND_EVENT, onChange);
}
// 설치한 앱으로 열었으면 띠는 없다
function bandSnapshot() {
  const panel = readBand();
  return panel && currentInstallEnv().kind !== "installed" ? panel : null;
}

// 화면 맨 위의 얇은 띠 — 아이폰 판의 "알겠어요"를 누르면 판이 이것으로 줄어든다 (lib/install-guide.ts 의 "안내 띠").
// 루트 레이아웃의 맨 위, 화면 흐름 안에 놓여서 아래 화면을 덮지 않고 그만큼 밀어 내린다. 같은 탭 안에서는 화면을 옮겨도 남는다.
// 화면 높이에 꽉 맞춘 화면(촬영 · 에디터 · 짐싸기)에서는 잠깐 숨는다 — 기록은 그대로라 돌아오면 다시 보인다
export function InstallGuideBand() {
  const panel = useSyncExternalStore(subscribeBand, bandSnapshot, () => null);
  const pathname = usePathname();
  if (!panel || bandHiddenOn(pathname)) return null;

  const steps = bandSteps(panel);
  return (
    <div
      role="region"
      aria-label="홈 화면에 추가하는 방법"
      className="shrink-0 border-b border-gray-3 bg-white pt-[env(safe-area-inset-top)] animate-fade-in motion-reduce:animate-none"
    >
      <div className="mx-auto flex min-h-11 w-full max-w-md items-center gap-1.5 pr-1 pl-5 text-label">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 py-2">
          {steps.map((part, index) => (
            <span key={index} className="contents">
              {index > 0 && (
                <span aria-hidden className="text-caption text-ink-muted">
                  →
                </span>
              )}
              <StepPiece part={part} />
            </span>
          ))}
        </span>
        <button
          type="button"
          aria-label="안내 띠 닫기"
          onClick={hideBand}
          className="flex size-11 flex-none items-center justify-center text-ink active:opacity-60"
        >
          <Icon name="close" scale={44 / 64} />
        </button>
      </div>
    </div>
  );
}
