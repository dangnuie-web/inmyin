// 화면 위에 덮는 판(누끼 손질 같은 것)을 폰의 뒤로 가기로 닫히게 하는 규칙.
// 판을 열 때 같은 주소로 이력을 한 칸 쌓고(state 에 표식), 뒤로 가기(popstate)로 그 칸을 빠져나가면 판을 닫는다.
// 판의 닫기 · 완료 버튼도 직접 닫지 않고 history.back() 으로 그 칸을 빼 준다 — 그래야 닫은 뒤의 뒤로 가기가 헛돌지 않는다.
// DOM 을 쓰지 않는 순수 함수라 시험(layer.test.mjs)이 그대로 부른다. 화면 쪽은 components/ui/useHistoryLayer.ts

export const LAYER_KEY = "inmyinLayer";

// 이력 칸의 state 에 적힌 판 이름. 없으면 null
export function layerOf(state: unknown): string | null {
  if (!state || typeof state !== "object") return null;
  const value = (state as Record<string, unknown>)[LAYER_KEY];
  return typeof value === "string" ? value : null;
}

// 판을 열 때 쌓을 칸의 state. Next 가 자기 표식(__NA 등)은 pushState 에서 알아서 옮겨 적는다
export function layerState(name: string) {
  return { [LAYER_KEY]: name };
}

// popstate 가 왔을 때 할 일.
// close — 판이 열려 있는데 판 칸을 빠져나왔다(뒤로 가기) → 판을 닫는다
// skip  — 판은 닫혔는데 판 칸으로 왔다(앞으로 가기) → 한 칸 더 뒤로. 판을 다시 열지 않는다(사진 · 손질 상태가 그때와 다를 수 있다)
// none  — 상관없는 이동
export type LayerPop = "close" | "skip" | "none";
export function onLayerPop(state: unknown, name: string, open: boolean): LayerPop {
  const here = layerOf(state) === name;
  if (open && !here) return "close";
  if (!open && here) return "skip";
  return "none";
}

// 닫기 · 완료 버튼을 눌렀을 때: 지금 판 칸에 있으면 back(그 칸을 빼면 popstate 가 닫는다), 아니면 바로 닫는다
export function closeBy(state: unknown, name: string): "back" | "direct" {
  return layerOf(state) === name ? "back" : "direct";
}
