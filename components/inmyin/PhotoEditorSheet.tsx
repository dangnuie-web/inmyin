"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { removeBackground } from "@/lib/background-removal";
import { resizeImage } from "@/lib/image/resize";
import { CANVAS_WIDTH } from "@/lib/inmyin/canvas";
import { cropToShape, HEART_CLIP, PHOTO_SHAPES, type PhotoShape } from "@/lib/inmyin/photo-shape";

type PhotoEditorSheetProps = {
  // 고른 파일. 아직 없으면 "갤러리에서 고르기" 버튼만
  file: File | null;
  onPickFile: () => void;
  // 다듬은 사진(원본 · 배경 지움 · 모양대로 자름)을 캔버스에
  onSubmit: (photo: Blob) => void;
};

// ＋ 판의 사진 칩 (에디터 ③ 사진 다듬기). 미리보기 · 배경 지우기(아이템 등록의 것과 같은 함수) · 모양 자르기 → 올리기.
// 모양은 미리보기에서 CSS 로 흉내 내고, 올릴 때 진짜로 잘라 PNG 를 만든다
export function PhotoEditorSheet({ file, onPickFile, onSubmit }: PhotoEditorSheetProps) {
  if (!file) {
    return (
      <button type="button" onClick={onPickFile} className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-ink text-label font-bold text-white active:opacity-80">
        <Icon name="gallery" className="size-6" />
        갤러리에서 고르기
      </button>
    );
  }
  // 다른 파일을 고르면 처음부터 (key 로 새로 만든다)
  return <PhotoTuner key={`${file.name}-${file.size}-${file.lastModified}`} file={file} onPickFile={onPickFile} onSubmit={onSubmit} />;
}

function PhotoTuner({ file, onPickFile, onSubmit }: PhotoEditorSheetProps & { file: File }) {
  // 캔버스 폭까지 줄인 원본과, 배경을 지운 것. 어느 쪽을 쓸지는 cutout
  const [original, setOriginal] = useState<Blob | null>(null);
  const [removed, setRemoved] = useState<Blob | null>(null);
  const [cutout, setCutout] = useState(false);
  const [shape, setShape] = useState<PhotoShape>("original");
  const [busy, setBusy] = useState<"removing" | "cropping" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    resizeImage(file, CANVAS_WIDTH).then((blob) => alive && setOriginal(blob));
    return () => {
      alive = false;
    };
  }, [file]);

  const current = cutout && removed ? removed : original;
  // 미리보기 주소. 바뀌면 옛것은 거둔다
  const previewUrl = useMemo(() => (current ? URL.createObjectURL(current) : null), [current]);
  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  async function toggleCutout() {
    if (!file) return;
    if (removed) return setCutout((on) => !on);
    setBusy("removing");
    setError(null);
    try {
      setRemoved(await removeBackground(file));
      setCutout(true);
    } catch {
      setError("배경을 지우지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    if (!current) return;
    setBusy("cropping");
    try {
      onSubmit(await cropToShape(current, shape));
    } catch {
      setError("사진을 자르지 못했어요. 다시 시도해 주세요.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 미리보기 — 모양은 CSS 로. 바둑판 무늬 위에 두어 배경을 지운 것이 보이게 */}
      <div className="relative flex h-56 items-center justify-center rounded-md bg-[repeating-conic-gradient(var(--color-gray-2)_0_25%,var(--color-white)_0_50%)] bg-[length:16px_16px]">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className={`max-h-full max-w-full ${shape === "original" ? "object-contain" : "aspect-square h-full object-cover"} ${SHAPE_CLASS[shape]}`} style={shape === "heart" ? { clipPath: `path("${heartClipPath()}")` } : undefined} />
        )}
        {busy === "removing" && <p className="absolute rounded-full bg-dropdown px-4 py-1.5 text-label font-bold text-white">배경을 지우는 중…</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={toggleCutout} disabled={busy !== null} aria-pressed={cutout} className={CHIP_CLASS(cutout)}>
          배경 지우기
        </button>
        <button type="button" onClick={onPickFile} disabled={busy !== null} className="rounded-md border border-border bg-white px-4 py-1 text-label font-semibold text-ink active:opacity-60 disabled:opacity-40">
          다른 사진
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-caption font-semibold text-ink-muted">모양</p>
        <div className="flex flex-wrap gap-2">
          {PHOTO_SHAPES.map((candidate) => (
            <button key={candidate.id} type="button" onClick={() => setShape(candidate.id)} aria-pressed={candidate.id === shape} className={CHIP_CLASS(candidate.id === shape)}>
              {candidate.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-caption text-primary">
          {error}
        </p>
      )}
      <button type="button" onClick={submit} disabled={!current || busy !== null} className="h-12 rounded-md bg-ink text-body font-bold text-white active:opacity-80 disabled:opacity-40">
        {busy === "cropping" ? "올리는 중…" : "올리기"}
      </button>
    </div>
  );
}

const SHAPE_CLASS: Record<PhotoShape, string> = {
  original: "rounded-sm",
  circle: "rounded-full",
  square: "",
  rounded: "rounded-[18%]",
  heart: "",
};

function CHIP_CLASS(on: boolean) {
  return `rounded-md border border-border px-4 py-1 text-label font-semibold disabled:opacity-40 ${on ? "bg-gray-2 text-ink" : "bg-white text-disabled"}`;
}

// CSS clip-path 의 path() 는 px 좌표라, 미리보기 높이(224px = h-56)에 맞춰 늘린다
function heartClipPath() {
  return HEART_CLIP.replace(/(\d+(?:\.\d+)?)/g, (n) => String(Number(n) * 224));
}
