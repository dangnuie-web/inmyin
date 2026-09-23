"use client";

import { useState } from "react";
import { TEXT_SIZES, type TextObject } from "@/lib/inmyin/canvas";
import { TEXT_FONTS, textFont } from "@/lib/inmyin/fonts";
import { ColorField } from "./ColorField";

// 글자의 모양 — 캔버스에 올리기 전에 정하는 것들 (자리 · 회전은 캔버스에서)
export type TextStyle = Pick<TextObject, "text" | "font" | "fontSize" | "fill" | "bold" | "stroke" | "background">;

export const DEFAULT_TEXT_STYLE: TextStyle = { text: "", font: "pretendard", fontSize: TEXT_SIZES.medium, fill: "#000000", bold: true, stroke: null, background: null };

const SIZES = [
  { id: TEXT_SIZES.small, label: "작게" },
  { id: TEXT_SIZES.medium, label: "보통" },
  { id: TEXT_SIZES.large, label: "크게" },
] as const;

const TEXT_MAX = 100;

type TextEditorProps = {
  // 고칠 때는 지금 모양, 새로 쓸 때는 기본 모양
  initial: TextStyle;
  editing: boolean;
  onSubmit: (style: TextStyle) => void;
};

// ＋ 판의 텍스트 칩 (에디터 ②). 글자를 치고 글꼴 · 크기 · 굵게 · 테두리 · 바탕 · 색을 고른 뒤 올린다 —
// 캔버스 위에서 바로 타이핑하는 것은 폰에서 까다로워서 판에서 한다. 위의 미리보기가 캔버스에 올라갈 모양이다
export function TextEditor({ initial, editing, onSubmit }: TextEditorProps) {
  const [style, setStyle] = useState<TextStyle>(initial);
  const font = textFont(style.font);
  const set = (patch: Partial<TextStyle>) => setStyle((current) => ({ ...current, ...patch }));

  return (
    <div className="flex flex-col gap-4">
      {/* 미리보기. 테두리는 글자 크기의 8% 로 캔버스와 같은 비율 */}
      <div className="flex min-h-20 items-center justify-center rounded-md bg-gray-1 px-4 py-3">
        <span
          className={`${font.className} max-w-full break-words text-center`}
          style={{
            fontFamily: font.family,
            fontSize: style.fontSize / 3,
            fontWeight: style.bold ? 700 : 400,
            color: style.fill,
            backgroundColor: style.background ?? undefined,
            padding: style.background ? "0.15em 0.4em" : 0,
            borderRadius: 8,
            WebkitTextStroke: style.stroke ? `${Math.max(1, style.fontSize / 3 / 12)}px ${style.stroke}` : undefined,
            paintOrder: "stroke fill",
            lineHeight: 1.3,
          }}
        >
          {style.text || "미리보기"}
        </span>
      </div>

      <textarea
        value={style.text}
        onChange={(event) => set({ text: event.target.value })}
        maxLength={TEXT_MAX}
        rows={2}
        placeholder="글자를 입력하세요"
        aria-label="글자"
        className="rounded-md border border-disabled bg-white px-3 py-2 text-body outline-none placeholder:text-disabled focus:border-ink"
      />

      {/* 글꼴 칩 — 각각 그 글꼴로 보인다 */}
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="글꼴">
        {TEXT_FONTS.map((candidate) => (
          <li key={candidate.id} className="shrink-0">
            <button
              type="button"
              onClick={() => set({ font: candidate.id })}
              aria-pressed={candidate.id === style.font}
              className={`${candidate.className} rounded-md border border-border px-3 py-1 text-link ${candidate.id === style.font ? "bg-gray-2 text-ink" : "bg-white text-ink-muted"}`}
              style={{ fontFamily: candidate.family }}
            >
              {candidate.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {SIZES.map((size) => (
          <Chip key={size.id} label={size.label} on={style.fontSize === size.id} onClick={() => set({ fontSize: size.id })} />
        ))}
        <span className="w-2" />
        <Chip label="굵게" on={style.bold} onClick={() => set({ bold: !style.bold })} />
        <Chip label="테두리" on={style.stroke !== null} onClick={() => set({ stroke: style.stroke ? null : "#ffffff" })} />
        <Chip label="바탕" on={style.background !== null} onClick={() => set({ background: style.background ? null : "#ffffff" })} />
      </div>

      <ColorField label="글자색" value={style.fill} onChange={(fill) => set({ fill })} />
      {style.stroke !== null && <ColorField label="테두리색" value={style.stroke} onChange={(stroke) => set({ stroke })} />}
      {style.background !== null && <ColorField label="바탕색" value={style.background} onChange={(background) => set({ background })} />}

      <button
        type="button"
        onClick={() => onSubmit({ ...style, text: style.text.trim() })}
        disabled={!style.text.trim()}
        className="mt-1 h-12 rounded-md bg-ink text-body font-bold text-white active:opacity-80 disabled:opacity-40"
      >
        {editing ? "고치기" : "올리기"}
      </button>
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`rounded-md border border-border px-4 py-1 text-label font-semibold ${on ? "bg-gray-2 text-ink" : "bg-white text-disabled"}`}>
      {label}
    </button>
  );
}
