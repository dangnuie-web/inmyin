"use client";

import Image from "next/image";
import { GRADIENT_DEFAULT } from "@/lib/inmyin/palette";
import { STICKERS, stickerLabel, stickerSrc } from "@/lib/inmyin/stickers";
import type { CanvasBackground } from "@/lib/inmyin/canvas";
import { ColorField } from "./ColorField";
import { PhotoEditorSheet } from "./PhotoEditorSheet";
import { TextEditor, type TextStyle } from "./TextEditor";

export type AddTab = "stickers" | "photo" | "text" | "background";

const TABS: { id: AddTab; label: string }[] = [
  { id: "stickers", label: "스티커" },
  { id: "photo", label: "사진" },
  { id: "text", label: "텍스트" },
  { id: "background", label: "배경" },
];

// 배경 칩. 단색 · 선형 · 원형 · 하트 · 패턴
const BACKGROUND_KINDS = [
  { id: "color", label: "단색" },
  { id: "linear", label: "선형" },
  { id: "radial", label: "원형" },
  { id: "heart", label: "하트" },
  { id: "pattern", label: "패턴" },
] as const;
type BackgroundKind = (typeof BACKGROUND_KINDS)[number]["id"];

const PATTERNS = [
  { id: "dots", label: "점" },
  { id: "stripes", label: "줄" },
  { id: "grid", label: "격자" },
  { id: "checker", label: "체크" },
] as const;

// 선형 그라디언트의 방향. 0 = →, 90 = ↓
const ANGLES = [
  { angle: 90, label: "↓" },
  { angle: 45, label: "↘" },
  { angle: 0, label: "→" },
  { angle: -45, label: "↗" },
] as const;

type AddSheetProps = {
  tab: AddTab;
  onTab: (tab: AddTab) => void;
  background: CanvasBackground;
  onBackground: (background: CanvasBackground) => void;
  onSticker: (code: string) => void;
  // 사진 칩. 고른 파일이 있으면 다듬기, 없으면 고르기 버튼
  photoFile: File | null;
  onPickPhoto: () => void;
  onPhoto: (photo: Blob) => void;
  // 텍스트 칩. 고치는 중이면 지금 글자의 모양이 들어온다
  textDraft: TextStyle;
  editingText: boolean;
  onText: (style: TextStyle) => void;
  onClose: () => void;
};

// ＋ 를 누르면 아래에서 올라오는 판 (인스타 스토리처럼 하나로). 맨 위 칩으로 스티커 · 사진 · 텍스트 · 배경을 오간다 —
// 헤더에 아이콘을 더 늘리지 않으려고. 배경은 고르는 즉시 캔버스에 보인다 (판 뒤가 살짝만 어두워서 미리 볼 수 있다)
export function AddSheet({ tab, onTab, background, onBackground, onSticker, photoFile, onPickPhoto, onPhoto, textDraft, editingText, onText, onClose }: AddSheetProps) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 cursor-default bg-ink/20" />
      <div role="dialog" aria-label="더하기" className="relative mx-auto flex max-h-[60dvh] min-h-[44dvh] w-full max-w-md flex-col rounded-t-xl bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Home 의 갈래와 같은 모양 — 고른 쪽에만 밑줄 */}
        <nav aria-label="더하기 갈래" className="flex items-end gap-7 px-5 pt-6 text-body font-bold text-ink">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onTab(entry.id)}
              aria-current={entry.id === tab ? "page" : undefined}
              className={`-mx-0.5 border-b-2 px-0.5 pb-1 leading-none active:opacity-60 ${entry.id === tab ? "border-ink" : "border-transparent text-ink-muted"}`}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-5">
          {tab === "stickers" && <Stickers onPick={onSticker} />}
          {tab === "photo" && <PhotoEditorSheet file={photoFile} onPickFile={onPickPhoto} onSubmit={onPhoto} />}
          {tab === "text" && <TextEditor initial={textDraft} editing={editingText} onSubmit={onText} />}
          {tab === "background" && <BackgroundPicker background={background} onChange={onBackground} />}
        </div>
      </div>
    </div>
  );
}

function Stickers({ onPick }: { onPick: (code: string) => void }) {
  return (
    <ul className="grid grid-cols-6 gap-2">
      {STICKERS.map((code) => (
        <li key={code}>
          <button type="button" onClick={() => onPick(code)} aria-label={stickerLabel(code)} className="flex aspect-square w-full items-center justify-center rounded-md active:bg-gray-2">
            <Image src={stickerSrc(code)} alt="" width={40} height={40} unoptimized />
          </button>
        </li>
      ))}
    </ul>
  );
}

// 배경 고르기 — 종류 칩 → (패턴이면 무늬 칩, 선형이면 방향 칩) → 색 견본 한두 줄. 누르는 즉시 캔버스에 칠해진다
function BackgroundPicker({ background, onChange }: { background: CanvasBackground; onChange: (background: CanvasBackground) => void }) {
  const kind: BackgroundKind = background.kind === "gradient" ? background.shape : background.kind;
  // 종류를 바꿔도 색은 되도록 이어 간다
  const [first, second] = colorsOf(background);

  function pickKind(next: BackgroundKind) {
    if (next === kind) return;
    if (next === "color") return onChange({ kind: "color", color: first });
    if (next === "pattern") return onChange({ kind: "pattern", pattern: "dots", color: first, ink: second });
    onChange({ kind: "gradient", shape: next, from: first, to: second, angle: background.kind === "gradient" ? background.angle : 90 });
  }

  function pickColor(slot: 0 | 1, color: string) {
    if (background.kind === "color") return onChange({ kind: "color", color });
    if (background.kind === "pattern") return onChange(slot === 0 ? { ...background, color } : { ...background, ink: color });
    onChange(slot === 0 ? { ...background, from: color } : { ...background, to: color });
  }

  return (
    <div className="flex flex-col gap-4">
      <Chips options={BACKGROUND_KINDS} current={kind} onPick={pickKind} />
      {background.kind === "pattern" && <Chips options={PATTERNS} current={background.pattern} onPick={(pattern) => onChange({ ...background, pattern })} />}
      {background.kind === "gradient" && background.shape === "linear" && (
        <Chips options={ANGLES.map(({ angle, label }) => ({ id: String(angle), label }))} current={String(background.angle)} onPick={(angle) => onChange({ ...background, angle: Number(angle) })} />
      )}
      <ColorField label={background.kind === "color" ? "색" : background.kind === "pattern" ? "바탕" : "안쪽"} value={first} onChange={(color) => pickColor(0, color)} />
      {background.kind !== "color" && <ColorField label={background.kind === "pattern" ? "무늬" : "바깥"} value={second} onChange={(color) => pickColor(1, color)} />}
    </div>
  );
}

function colorsOf(background: CanvasBackground): [string, string] {
  // 단색에서 그라디언트로 넘어갈 때 두 번째 색은 기본 짝에서 — 지금 색과 같으면 반대쪽 것
  if (background.kind === "color") return [background.color, background.color === GRADIENT_DEFAULT.to ? GRADIENT_DEFAULT.from : GRADIENT_DEFAULT.to];
  if (background.kind === "pattern") return [background.color, background.ink];
  return [background.from, background.to];
}

function Chips<T extends string>({ options, current, onPick }: { options: readonly { id: T; label: string }[]; current: T; onPick: (id: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onPick(option.id)}
          aria-pressed={option.id === current}
          className={`rounded-md border border-border px-4 py-1 text-label font-semibold ${option.id === current ? "bg-gray-2 text-ink" : "bg-white text-disabled"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
