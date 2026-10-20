"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { PhotoPreview } from "@/components/ui/PhotoPreview";
import { Toast } from "@/components/ui/Toast";
import { removeBackground } from "@/lib/background-removal";
import { analyze, autoAdjust, buildLuts, isIdentity, NO_AUTO, NO_MANUAL, type AutoAdjust, type ManualAdjust } from "@/lib/image/adjust";
import { adjustedFile, drawAdjusted, loadPixels } from "@/lib/image/adjust-canvas";
import { getPendingPhoto, setPendingPhoto } from "@/lib/image/pending-photo";

type PhotoEditorProps = {
  // 사진 없이 들어왔을 때(새로고침 등) 돌려보낼 곳
  closeHref: string;
  // 저장하기를 누르면 갈 곳 (정보 입력 화면)
  nextHref: string;
};

// 세부 조정 슬라이더 네 개 (이름 · 왼쪽 끝 · 오른쪽 끝)
const SLIDERS: { key: keyof ManualAdjust; label: string; low: string; high: string }[] = [
  { key: "brightness", label: "밝기", low: "어둡게", high: "밝게" },
  { key: "contrast", label: "대비", low: "흐리게", high: "진하게" },
  { key: "temperature", label: "색온도", low: "파랗게", high: "노랗게" },
  { key: "tint", label: "색조", low: "녹색", high: "자주색" },
];

// M-07 · 사진 편집. 아이템 등록과 인벤토리 만들기가 같이 쓴다.
// 배경제거를 누르면 물건만 남고, 다시 누르면 원래 사진으로 돌아온다. 원본은 어느 쪽이든 그대로 보관된다.
// 자동 보정 · 세부 조정(밝기 · 대비 · 색온도 · 색조)도 칸에 보일 사진(썸네일)에만 입힌다.
// 순서: 배경은 보정 전 사진에서 지우고, 보정은 그 위에 입힌다 — 보정은 픽셀마다 따로 바뀌는 표(LUT)라
// 앞에 하든 뒤에 하든 물건의 색은 같고, 이렇게 하면 슬라이더를 밀 때마다 배경을 다시 지우지 않아도 된다
export function PhotoEditor({ closeHref, nextHref }: PhotoEditorProps) {
  const router = useRouter();
  const [pending] = useState(getPendingPhoto);
  // 배경을 지운 사진. 한 번 만들어 두면 껐다 켜도 다시 만들지 않는다
  const [cutout, setCutout] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  // 자동 보정 값은 배경을 지우기 전 사진 전체를 보고 한 번 정한다 — 배경제거를 껐다 켜도 색이 바뀌지 않게
  const [auto, setAuto] = useState<AutoAdjust | null>(null);
  const [autoOn, setAutoOn] = useState(false);
  const [manual, setManual] = useState<ManualAdjust>(NO_MANUAL);
  const [detailOpen, setDetailOpen] = useState(false);
  // 지금 보이는 사진(원래 사진 또는 배경을 지운 것)을 썸네일 크기로 읽은 픽셀
  const [base, setBase] = useState<{ source: File; pixels: ImageData } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 사진은 앞 단계에서 들고 온다. 새로고침으로 잃었으면 + 부터 다시 한다
  useEffect(() => {
    if (!pending) router.replace(closeHref);
  }, [pending, router, closeHref]);

  const source = pending ? (removed && cutout ? cutout : pending.photo) : null;

  // 자동 보정 값 정하기 (사진마다 한 번)
  useEffect(() => {
    if (!pending) return;
    let alive = true;
    loadPixels(pending.photo)
      .then((pixels) => alive && setAuto(autoAdjust(analyze(pixels.data))))
      .catch(() => alive && setAuto(NO_AUTO));
    return () => {
      alive = false;
    };
  }, [pending]);

  // 보이는 사진이 바뀌면(배경제거 켜고 끄기) 픽셀을 다시 읽는다
  useEffect(() => {
    if (!source) return;
    let alive = true;
    loadPixels(source)
      .then((pixels) => alive && setBase({ source, pixels }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [source]);

  const adjusting = !isIdentity(autoOn ? auto : null, manual);
  const luts = useMemo(() => buildLuts(autoOn && auto ? auto : NO_AUTO, manual), [autoOn, auto, manual]);
  // 그려 둔 픽셀이 지금 보이는 사진의 것일 때만 캔버스를 쓴다. 아직 읽는 중이면 원래 미리보기
  const ready = adjusting && base?.source === source;

  useEffect(() => {
    if (ready && base && canvasRef.current) drawAdjusted(canvasRef.current, base.pixels, luts);
  }, [ready, base, luts]);

  if (!pending || !source) return null;
  const photo = source;

  async function onToggleBackground() {
    if (!pending) return;
    if (removed || cutout) return setRemoved(!removed);

    setWorking(true);
    try {
      const blob = await removeBackground(pending.photo);
      setCutout(new File([blob], "cutout.png", { type: blob.type }));
      setRemoved(true);
    } catch {
      setNotice("배경을 지우지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setWorking(false);
    }
  }

  // 정보 입력에서 뒤로 오면 이 화면이 아니라 촬영 화면이 나오도록 주소를 갈아 끼운다 —
  // 정보 입력을 떠나면 들고 있던 사진이 비워져서, 이 화면은 보여줄 것이 없다
  async function onSave() {
    if (!pending) return;
    let thumbnail = photo;
    if (adjusting) {
      setWorking(true);
      try {
        // 보정한 것은 칸에 보일 사진뿐. 원본(raw)은 찍힌 그대로 (CLAUDE.md 규칙 7)
        const pixels = base?.source === photo ? base.pixels : await loadPixels(photo);
        thumbnail = await adjustedFile(pixels, luts, photo.type === "image/png");
      } catch {
        setWorking(false);
        return setNotice("보정한 사진을 만들지 못했습니다. 다시 시도해 주세요.");
      }
    }
    setPendingPhoto({ photo: thumbnail, raw: pending.raw });
    router.replace(nextHref);
  }

  function setSlider(key: keyof ManualAdjust, value: number) {
    setManual((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ink text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <HeaderMini
          icon="back"
          onClick={() => router.back()}
          title="사진편집"
          tone="dark"
          action={
            <button
              type="button"
              onClick={onToggleBackground}
              disabled={working}
              aria-pressed={removed}
              className="flex items-center gap-2.5 text-label font-bold active:opacity-80 disabled:opacity-40"
            >
              배경제거
              <span
                className={`flex size-11.5 items-center justify-center rounded-full ${
                  removed ? "bg-point text-white" : "bg-gray-3 text-ink"
                }`}
              >
                <Icon name="sparkle" />
              </span>
            </button>
          }
        />

        <div className="flex flex-1 items-center px-3 py-6">
          {/* 칸과 같은 옅은 회색 바탕 · 같은 자르기(가운데 정사각형)로 보여준다 — 격자에서 어떻게 보일지 그대로다 */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-1">
            <PhotoPreview file={photo} className={working ? "animate-pulse" : ""} />
            {/* 보정한 모습. 저장되는 썸네일과 같은 계산 · 같은 크기(긴 변 640)다 */}
            <canvas
              ref={canvasRef}
              aria-hidden
              className={`absolute inset-0 size-full object-cover ${ready ? "" : "hidden"} ${working ? "animate-pulse" : ""}`}
            />
            {working && (
              <p role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-dropdown text-center text-label">
                <span className="font-bold">배경을 지우는 중…</span>
                <span className="text-caption">처음에는 시간이 조금 걸려요.</span>
              </p>
            )}
          </div>
        </div>

        <div className="px-5 pb-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setAutoOn(!autoOn)}
              disabled={working || !auto}
              aria-pressed={autoOn}
              className={`h-9 rounded-full border px-4 text-label font-bold active:opacity-80 disabled:opacity-40 ${
                autoOn ? "border-white bg-white text-ink" : "border-gray-4 text-white"
              }`}
            >
              자동 보정
            </button>
            <button
              type="button"
              onClick={() => setDetailOpen(!detailOpen)}
              aria-expanded={detailOpen}
              aria-controls="photo-adjust-detail"
              className="flex h-9 items-center gap-1 text-label text-gray-mid active:opacity-80"
            >
              세부 조정
              <span aria-hidden className={`inline-block transition-transform ${detailOpen ? "rotate-180" : ""}`}>
                ⌄
              </span>
            </button>
          </div>

          {detailOpen && (
            <div id="photo-adjust-detail" className="mt-4 flex flex-col gap-3">
              {SLIDERS.map(({ key, label, low, high }) => (
                <label key={key} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3 text-caption">
                  <span className="text-gray-mid">{label}</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={1}
                    value={manual[key]}
                    onChange={(event) => setSlider(key, Number(event.target.value))}
                    disabled={working}
                    aria-valuetext={manual[key] === 0 ? "그대로" : `${manual[key] < 0 ? low : high} ${Math.abs(manual[key])}`}
                    className="h-6 w-full accent-white"
                  />
                  <span className="text-right tabular-nums text-gray-mid">{manual[key] > 0 ? `+${manual[key]}` : manual[key]}</span>
                </label>
              ))}
              <button
                type="button"
                onClick={() => setManual(NO_MANUAL)}
                disabled={working || isIdentity(null, manual)}
                className="self-end text-caption text-gray-mid underline underline-offset-2 active:opacity-80 disabled:opacity-40"
              >
                세부 조정 되돌리기
              </button>
            </div>
          )}
        </div>

        <Button variant="dark" size="pill" onClick={onSave} disabled={working} className="mx-auto mb-[max(2.5rem,env(safe-area-inset-bottom))]">
          저장하기
        </Button>
      </div>
      <Toast message={notice} onDone={hideNotice} />
    </main>
  );
}
