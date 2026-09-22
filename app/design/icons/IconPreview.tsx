"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { BUILT_IN_COUNT, builtInSrc } from "./candidates";
import { Squircle, SquircleDefs } from "./Squircle";

// 홈 화면 앱 아이콘 시안을 폰에서 골라 보는 확인용 페이지. 앱 기능이 아니다.
// 시안은 두 갈래다: 리포지토리에 들어 있는 것(candidates.ts)과 폰에서 직접 넣은 것.
// 직접 넣은 그림은 서버에 올리지 않고 이 브라우저(localStorage)에만 남는다 — 그래서 다른 기기에서는 다시 넣어야 한다.

// builtIn 이 있으면 리포지토리의 시안 (그 번호), 없으면 폰에서 넣은 것
type Candidate = { id: string; src: string; builtIn?: number };

const BUILT_IN: Candidate[] = Array.from({ length: BUILT_IN_COUNT }, (_, i) => ({
  id: `built-in-${i + 1}`,
  src: builtInSrc(i + 1),
  builtIn: i + 1,
}));

const STORAGE_KEY = "inmyin.icon-candidates";
// 아이폰 홈 화면 아이콘은 60pt. 3배 화면이면 180px 인데, 아래의 "크게 보기"(120pt)까지 감안해 360px 로 줄여 둔다
const CANDIDATE_SIDE = 360;

// ---- 저장 — localStorage 를 React 가 구독할 수 있게 감싼다 ----

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 사파리의 사생활 보호 모드처럼 localStorage 가 막힌 곳에서는 빈 목록으로 시작한다
function readRaw() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

// 저장에 실패하면(용량 초과 등) false 를 돌려준다
function write(list: Candidate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    return false;
  }
  listeners.forEach((listener) => listener());
  return true;
}

function parse(raw: string): Candidate[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// ---- 그림 다듬기 ----

// 고른 그림을 정사각형 360px 로 줄인다. 투명한 부분은 그대로 둔다 — 아이폰 모양으로 보여줄 때만 검정을 깐다 (Squircle 의 bg-ink)
async function toCandidate(file: File): Promise<Candidate> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = CANDIDATE_SIDE;

  // 정사각형이 아니면 가운데를 꽉 차게 잘라 넣는다
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, side, side, 0, 0, CANDIDATE_SIDE, CANDIDATE_SIDE);
  bitmap.close();

  return { id: crypto.randomUUID(), src: canvas.toDataURL("image/png") };
}

// 투명한 부분이 티가 나도록 까는 체크무늬 (app/design/page.tsx 와 같은 것)
const CHECKER = "repeating-conic-gradient(var(--color-gray-3) 0% 25%, var(--color-white) 0% 50%) 0 0 / 16px 16px";

// ---- 가짜 홈 화면 ----

type Wallpaper = "dark" | "light";

const WALLPAPER = {
  dark: { bg: "bg-linear-to-b from-surface-dark via-field-dark to-ink", text: "text-white", dock: "bg-white/15", dot: "bg-white" },
  // 흰 페이지 위라 테두리가 있어야 홈 화면의 끝이 보인다
  light: { bg: "border border-border bg-linear-to-b from-white via-gray-1 to-gray-2", text: "text-ink", dock: "bg-ink/10", dot: "bg-ink" },
};

// 시안 옆에 놓일 다른 앱들. 이름과 색은 아무거나 — 시안이 낯선 아이콘들 사이에서 어떻게 보이는지만 보면 된다
const FILLER_NAMES = ["메시지", "캘린더", "사진", "카메라", "메일", "시계", "지도", "날씨", "메모", "음악", "설정", "지갑", "건강", "파일", "연락처", "계산기", "팟캐스트", "주식", "번역", "책", "전화", "브라우저", "알림", "게임"];
const FILLER_TONES = ["bg-primary", "bg-gray-4", "bg-point", "bg-gray-mid", "bg-kakao", "bg-surface-dark", "bg-white", "bg-gray-3"];

// 시안이 들어갈 자리 — 둘째 줄 둘째 칸(다른 앱들에 둘러싸인 자리)과 독의 셋째 칸
const GRID_SLOTS = 24;
const CANDIDATE_SLOT = 5;
const DOCK_SLOTS = 4;
const CANDIDATE_DOCK_SLOT = 2;

function FillerIcon({ index, size }: { index: number; size: number }) {
  return (
    <Squircle size={size} className={`flex items-center justify-center ${FILLER_TONES[index % FILLER_TONES.length]}`}>
      <span className="size-1/3 rounded-full bg-white/40" />
    </Squircle>
  );
}

function HomeScreen({ candidate, wallpaper }: { candidate?: Candidate; wallpaper: Wallpaper }) {
  const look = WALLPAPER[wallpaper];
  // 아이폰 홈 화면의 글자는 11pt — 우리 토큰이 아니라 아이폰 것을 흉내 낸다
  const label = `text-[11px] leading-none ${look.text}`;

  return (
    <div className={`mx-auto flex w-full max-w-[390px] flex-col rounded-xl px-7 pt-3 pb-4 ${look.bg}`}>
      <div className={`flex h-8 items-center justify-between text-caption font-semibold ${look.text}`}>
        <span>9:41</span>
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-current" />
          <span className="size-1.5 rounded-full bg-current" />
          <span className="size-1.5 rounded-full bg-current" />
        </span>
      </div>

      <ul className="grid grid-cols-4 justify-items-center gap-y-6 pt-4">
        {Array.from({ length: GRID_SLOTS }, (_, i) => (
          <li key={i} className="flex w-15 flex-col items-center gap-1.5">
            {i === CANDIDATE_SLOT ? <Squircle src={candidate?.src} size={60} className="bg-ink" /> : <FillerIcon index={i} size={60} />}
            <span className={`max-w-full truncate ${label}`}>{i === CANDIDATE_SLOT ? "INMYIN" : FILLER_NAMES[i]}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-center gap-2 py-5">
        <span className={`size-1.5 rounded-full ${look.dot}`} />
        <span className={`size-1.5 rounded-full opacity-30 ${look.dot}`} />
      </div>

      <ul className={`flex justify-around rounded-xl px-2 py-4 backdrop-blur ${look.dock}`}>
        {Array.from({ length: DOCK_SLOTS }, (_, i) => (
          <li key={i}>
            {i === CANDIDATE_DOCK_SLOT ? <Squircle src={candidate?.src} size={60} className="bg-ink" /> : <FillerIcon index={GRID_SLOTS + i} size={60} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---- 페이지 ----

export function IconPreview() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const uploaded = useMemo(() => parse(raw), [raw]);
  const candidates = useMemo(() => [...BUILT_IN, ...uploaded], [uploaded]);
  const [selectedId, setSelectedId] = useState<string>();
  const [wallpaper, setWallpaper] = useState<Wallpaper>("dark");
  const [message, setMessage] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = candidates.find((c) => c.id === selectedId) ?? candidates[0];

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setMessage(undefined);
    try {
      const added = await Promise.all(Array.from(files).map(toCandidate));
      if (!write([...uploaded, ...added])) setMessage("브라우저 저장 공간이 모자라요. 안 쓰는 시안을 지우고 다시 넣어 주세요.");
      else setSelectedId(added[0].id);
    } catch {
      setMessage("그림을 읽지 못했어요. PNG 나 JPG 로 다시 내보내 주세요.");
    }
  }

  function remove(id: string) {
    write(uploaded.filter((c) => c.id !== id));
  }

  return (
    <div className="flex flex-col gap-8">
      <SquircleDefs />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-title font-bold">시안 {candidates.length}개</h2>
          <Button size="sm" onClick={() => inputRef.current?.click()}>
            그림 추가
          </Button>
          <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        </div>

        {/* 흰 시안도 보이게 옅은 바탕을 깐다 */}
        <ul className="-mx-5 flex gap-4 overflow-x-auto bg-gray-2 px-5 pt-3 pb-2">
          {candidates.map((c, i) => {
            const isSelected = c.id === selected?.id;
            return (
              <li key={c.id} className="relative flex shrink-0 flex-col items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`rounded-lg p-1 transition-shadow ${isSelected ? "ring-2 ring-point" : ""}`}
                  aria-pressed={isSelected}
                  aria-label={`${i + 1}번 시안 고르기`}
                >
                  <Squircle src={c.src} size={64} className="bg-ink" />
                </button>
                <span className="text-caption text-ink-muted">{i + 1}</span>
                {/* 리포지토리의 시안은 못 지운다 — 폰에서 넣은 것만 */}
                {!c.builtIn && (
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label={`${i + 1}번 시안 지우기`}
                    className="absolute -top-1 -right-1 flex size-6 items-center justify-center rounded-full bg-ink text-caption leading-none text-white"
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-caption text-ink-muted">
          1~{BUILT_IN_COUNT}번은 SVG 폴더의 시안이에요. 새로 그린 게 있으면 PNG 로 내보내 사진첩에 넣고 그림 추가로 골라 보세요 — 그건 이 폰에만 남아요.
        </p>
        {message && <p className="text-caption text-primary">{message}</p>}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-title font-bold">홈 화면</h2>
          <div className="flex overflow-hidden rounded-sm border border-disabled text-label">
            {(["dark", "light"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWallpaper(w)}
                className={`px-3 py-1.5 ${wallpaper === w ? "bg-ink text-white" : "bg-white text-ink"}`}
                aria-pressed={wallpaper === w}
              >
                {w === "dark" ? "어두운 배경" : "밝은 배경"}
              </button>
            ))}
          </div>
        </div>
        <HomeScreen candidate={selected} wallpaper={wallpaper} />
        {selected?.builtIn ? (
          <Link href={`/design/icons/${selected.builtIn}`} className="text-label font-semibold text-point underline">
            {selected.builtIn}번을 진짜 홈 화면에 깔아 보기 →
          </Link>
        ) : (
          selected && <p className="text-caption text-ink-muted">폰에서 넣은 그림은 진짜 홈 화면에는 못 깔아요 — 파일이 서버에 없어서요. 마음에 들면 SVG 폴더에 넣어 주세요.</p>
        )}
      </section>

      {selected && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title font-bold">크게 보기</h2>
          <div className="flex items-end justify-center gap-6 rounded-xl bg-surface py-6">
            <div className="flex flex-col items-center gap-2">
              <Squircle src={selected.src} size={120} className="bg-ink" />
              <span className="text-caption text-ink-muted">홈 화면에 놓일 모양</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="overflow-hidden rounded-sm border border-border" style={{ background: CHECKER }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저 안의 data URL 이라 next/image 를 쓸 수 없다 */}
                <img src={selected.src} alt="" className="size-30" draggable={false} />
              </div>
              <span className="text-caption text-ink-muted">내보낸 그대로</span>
            </div>
          </div>
          <p className="text-caption text-ink-muted">투명한 곳은 아이폰이 검게 칠해요. 모서리는 아이폰이 알아서 둥글리니, 시안은 꽉 찬 네모로 내보내면 돼요.</p>
        </section>
      )}
    </div>
  );
}
