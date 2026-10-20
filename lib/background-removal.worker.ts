// 배경제거 일꾼(Web Worker) — 계산을 화면과 다른 스레드에서 돌린다 (lib/background-removal.ts 가 만들고 부른다).
// 화면 스레드에서 돌리면 계산하는 동안(데스크톱에서도 약 15초) 알약 · 선 · 버튼이 모두 멈춘다.
// 라이브러리는 일꾼 안에서 document 대신 OffscreenCanvas 로 사진을 읽고 쓴다. 모델 파일은 화면과 같은 브라우저 캐시를 쓴다.
//
// 주고받는 말:
//   받음  { id, buffer, type }                       — 줄인 사진(buffer 는 넘겨받음, 복사 없음)
//   보냄  { id, kind: "progress", key, current, total } — 라이브러리 진행률 그대로(정리는 화면 쪽 trackProgress)
//         { id, kind: "done", buffer, type }          — 배경을 지운 PNG(buffer 는 넘겨줌)
//         { id, kind: "error", message }              — 라이브러리가 실패함 → 화면은 실패 알림
//         { id, kind: "unsupported" }                 — 이 브라우저의 일꾼에선 못 돎 → 화면 스레드에서 지금 방식으로

import { removeBackground } from "@imgly/background-removal";

type Request = { id: number; buffer: ArrayBuffer; type: string };

// tsconfig 에 webworker 타입이 없어서, 쓰는 것만 적어 둔다
const scope = self as unknown as {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<Request>) => void) | null;
};

scope.onmessage = async ({ data: { id, buffer, type } }) => {
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
    scope.postMessage({ id, kind: "unsupported" });
    return;
  }
  try {
    const blob = await removeBackground(new Blob([buffer], { type }), {
      progress: (key, current, total) => scope.postMessage({ id, kind: "progress", key, current, total }),
    });
    const out = await blob.arrayBuffer();
    scope.postMessage({ id, kind: "done", buffer: out, type: blob.type }, [out]);
  } catch (error) {
    scope.postMessage({ id, kind: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
