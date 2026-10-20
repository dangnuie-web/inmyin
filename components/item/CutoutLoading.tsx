"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { borderPath, CUTOUT_LOADING, pillText, stepShown, type CutoutProgress } from "@/lib/image/cutout-motion";

// 연출 시간 값을 CSS 변수로 — 사진 칸에 걸어 두면 테두리 선 · 걷히는 층 · 별 버튼이 같이 쓴다 (globals.css .cutout-*)
export function cutoutStyle(saveQueued: boolean): CSSProperties {
  const v = CUTOUT_LOADING;
  return {
    "--cutout-lap": `${v.lap}ms`,
    "--cutout-close": `${v.close}ms`,
    "--cutout-reveal": `${Math.round(v.reveal * (saveQueued ? v.saveRevealScale : 1))}ms`,
    "--cutout-reduced-fade": `${v.reducedFade}ms`,
    "--cutout-twinkle": `${v.starTwinkle}ms`,
    "--cutout-retouch-fade": `${v.retouchFade}ms`,
  } as CSSProperties;
}

// 기다림(waiting) · 끝나서 닫히고 걷히는 중(closing) · 안 보임(hidden)
export type CutoutLoadingPhase = "waiting" | "closing" | "hidden";

type CutoutLoadingProps = {
  phase: CutoutLoadingPhase;
  // 지우기가 아직 도는지 — 꺼 둔 동안에도 선 길이는 계속 따라가 둔다(다시 켜면 이어서)
  running: boolean;
  // 이번 지우기를 시작한 때(performance.now)
  startedAt: number;
  // 라이브러리가 준 진행률. null 이면 모름 → 가짜 곡선, 알약에 % 없음
  progressRef: RefObject<CutoutProgress | null>;
  firstTime: boolean;
  saveQueued: boolean;
};

// M-07 · 배경 지우는 동안의 연출 — B안 테두리 잇기 (무늬 누끼로딩설계 v01). 사진 칸(relative) 안에 겹쳐 놓는다.
// 사진은 가리지 않는다 — 기다리는 동안 자동 보정 · 세부 조정이 그대로 보인다.
// 선 길이는 tick(0.2초)마다 정하고 사이는 CSS transition 이 잇는다. 밝은 머리는 CSS 애니메이션만으로 돈다
export function CutoutLoading({ phase, running, startedAt, progressRef, firstTime, saveQueued }: CutoutLoadingProps) {
  const v = CUTOUT_LOADING;
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState(0);
  const [state, setState] = useState({ shown: 0, elapsed: 0, known: false });

  // 사진 칸 크기에 맞춰 테두리 모양을 다시 잡는다
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(([entry]) => setSize(Math.round(entry.contentRect.width)));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const target = progressRef.current;
      setState((prev) => ({
        shown: stepShown(prev.shown, target, now - last, now - startedAt),
        elapsed: now - startedAt,
        known: target !== null,
      }));
      last = now;
    }, v.tick);
    return () => window.clearInterval(id);
  }, [running, startedAt, progressRef, v.tick]);

  const closing = phase === "closing";
  const shown = closing ? 1 : state.shown;
  const pill = phase === "waiting" ? pillText({ elapsedMs: state.elapsed, saveQueued, firstTime, percent: state.known ? state.shown : null }) : null;
  const d = size > 0 ? borderPath(size, v.inset) : "";

  return (
    <>
      <svg
        ref={svgRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 size-full transition-opacity duration-150 ${phase === "hidden" ? "opacity-0" : ""} ${
          closing ? "cutout-border-out" : ""
        }`}
      >
        {d && (
          <>
            {/* 진행 선 — dasharray "1 1" 에 offset 1 - 길이 로 앞에서부터 그만큼만 보인다 */}
            <path
              d={d}
              pathLength={1}
              fill="none"
              stroke="#fff"
              strokeWidth={v.stroke}
              strokeLinecap="round"
              strokeDasharray="1 1"
              strokeDashoffset={1 - shown}
              className="motion-reduce:transition-none"
              style={{
                transition: closing
                  ? `stroke-dashoffset ${v.close}ms cubic-bezier(0.33, 1, 0.68, 1)`
                  : `stroke-dashoffset ${v.tick}ms linear`,
              }}
            />
            {/* 늘 도는 밝은 머리 — 숫자가 멈춰도 살아 있게 */}
            {phase === "waiting" && (
              <path
                d={d}
                pathLength={1}
                fill="none"
                stroke="#fff"
                strokeOpacity={v.headOpacity}
                strokeWidth={v.headStroke}
                strokeLinecap="round"
                strokeDasharray={`${v.head} ${1 - v.head}`}
                className="cutout-head"
              />
            )}
          </>
        )}
      </svg>
      {pill && (
        <p
          role="status"
          className="absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-2 rounded-full bg-dropdown px-4 py-2 text-caption text-white"
        >
          <span>{pill.text}</span>
          {pill.percent && <span className="num text-gray-mid">{pill.percent}</span>}
        </p>
      )}
    </>
  );
}
