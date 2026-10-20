import { newProgressTracker, trackProgress, type CutoutProgress } from "@/lib/image/cutout-motion";
import { resizeImage, THUMBNAIL_MAX_SIDE } from "@/lib/image/resize";

// 사진에서 물건만 남기고 배경을 지운다. 돌려주는 것은 배경이 투명한 PNG 다.
//
// 배경제거 라이브러리는 이 함수 안에서만 부른다 (CLAUDE.md). 나중에 외부 API 로 갈아타도 이 파일만 바꾸면 된다.
// 지금은 @imgly/background-removal — 사진이 밖으로 나가지 않고 폰 안에서 처리된다.
// 처음 한 번은 AI 모델 파일을 내려받느라 오래 걸리고, 그 뒤로는 브라우저가 저장해 둔 것을 쓴다.
//
// 이 라이브러리는 AGPL-3.0 이다. 그래서 INMYIN 의 소스코드도 AGPL 로 공개한다 (README.md).
// 라이선스가 자유로운 다른 모델로 갈아타면 그때 다시 비공개로 돌릴 수 있다 (docs/roadmap.md "나중에 할 일")
//
// onProgress 는 진행률(0~1, 줄어들지 않음)을 받는다 — 내려받기 80% + 계산 네 단계 20%.
//
// 계산은 일꾼(Web Worker, background-removal.worker.ts)에서 돌린다. 화면 스레드에서 돌리면 계산하는 동안 화면이 통째로 멈춰서
// 알약 · 테두리 선 · 버튼이 모두 서 버린다(2026-10-20 측정: 모델을 이미 받은 두 번째 실행에서 약 15초 한 덩어리).
// 일꾼을 못 쓰는 브라우저(일꾼 · OffscreenCanvas 가 없거나 일꾼이 안 뜸)는 예전처럼 화면 스레드에서 돌린다.
export async function removeBackground(file: File, onProgress?: (progress: CutoutProgress) => void): Promise<Blob> {
  // 썸네일 크기로 먼저 줄인다 — 어차피 그 크기로 저장되고, 큰 사진은 폰에서 느리고 메모리가 모자란다
  const small = await resizeImage(file, THUMBNAIL_MAX_SIDE);
  const tracker = newProgressTracker();
  const report = onProgress ? (key: string, current: number, total: number) => onProgress(trackProgress(tracker, key, current, total)) : undefined;

  const worker = getWorker();
  if (worker) {
    try {
      return await runInWorker(worker, small, report);
    } catch (error) {
      if (!(error instanceof WorkerUnavailable)) throw error;
      // 일꾼이 안 떴거나 못 도는 브라우저 — 이번 것부터 화면 스레드에서
    }
  }
  return runHere(small, report);
}

type Progress = (key: string, current: number, total: number) => void;

// 예전 방식 — 화면 스레드에서. 쓸 때에야 불러온다. 라이브러리가 커서, 미리 불러오면 모든 화면이 느려진다
async function runHere(small: Blob, progress: Progress | undefined) {
  const { removeBackground: run } = await import("@imgly/background-removal");
  return run(small, { progress });
}

// 일꾼은 한 번 만들어 다시 쓴다 — 두 번째부터는 모델을 다시 읽지 않는다(라이브러리가 일꾼 안에 들고 있음)
class WorkerUnavailable extends Error {}
type Job = { resolve: (blob: Blob) => void; reject: (error: Error) => void; progress?: Progress };
// undefined = 아직 안 만듦(또는 죽어서 다시 만들 것), null = 이 브라우저에선 안 씀
let worker: Worker | null | undefined;
// 일꾼이 한 번이라도 말을 했는지 — 뜨지도 못한 것과 돌다 죽은 것(메모리 등)을 가른다
let started = false;
let nextId = 0;
const jobs = new Map<number, Job>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return (worker = null);
  try {
    worker = new Worker(new URL("./background-removal.worker.ts", import.meta.url), { type: "module", name: "background-removal" });
  } catch {
    return (worker = null);
  }
  worker.onmessage = ({ data }: MessageEvent) => {
    started = true;
    const job = jobs.get(data.id);
    if (!job) return;
    if (data.kind === "progress") {
      job.progress?.(data.key, data.current, data.total);
      return;
    }
    jobs.delete(data.id);
    if (data.kind === "done") job.resolve(new Blob([data.buffer], { type: data.type }));
    else if (data.kind === "error") job.reject(new Error(data.message));
    else {
      jobs.set(data.id, job);
      giveUp(false);
    }
  };
  worker.onerror = (event) => {
    event.preventDefault();
    giveUp(started);
  };
  worker.onmessageerror = () => giveUp(started);
  return worker;
}

// 뜨지도 못했으면(일꾼 파일을 못 읽음 · 못 도는 브라우저) 다시 만들지 않고 이번 것부터 화면 스레드에서 돌린다.
// 돌다가 죽었으면(폰 메모리 등) 화면 스레드로 넘기지 않고 실패로 알린다 — 같은 계산을 화면에서 돌리면 탭이 통째로 죽을 수 있어서.
// 다음에 다시 누르면 일꾼을 새로 만든다
function giveUp(crashed: boolean) {
  worker?.terminate();
  worker = crashed ? undefined : null;
  started = false;
  for (const job of jobs.values()) job.reject(crashed ? new Error("배경제거 일꾼이 멈췄습니다.") : new WorkerUnavailable());
  jobs.clear();
}

async function runInWorker(target: Worker, small: Blob, progress: Progress | undefined) {
  const buffer = await small.arrayBuffer();
  return new Promise<Blob>((resolve, reject) => {
    const id = ++nextId;
    jobs.set(id, { resolve, reject, progress });
    // 사진 버퍼는 복사하지 않고 넘긴다
    target.postMessage({ id, buffer, type: small.type }, [buffer]);
  });
}
