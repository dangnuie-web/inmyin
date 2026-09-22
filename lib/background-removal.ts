import { resizeImage, THUMBNAIL_MAX_SIDE } from "@/lib/image/resize";

// 사진에서 물건만 남기고 배경을 지운다. 돌려주는 것은 배경이 투명한 PNG 다.
//
// 배경제거 라이브러리는 이 함수 안에서만 부른다 (CLAUDE.md). 나중에 외부 API 로 갈아타도 이 파일만 바꾸면 된다.
// 지금은 @imgly/background-removal — 사진이 밖으로 나가지 않고 폰 안에서 처리된다.
// 처음 한 번은 AI 모델 파일을 내려받느라 오래 걸리고, 그 뒤로는 브라우저가 저장해 둔 것을 쓴다.
//
// 이 라이브러리는 AGPL-3.0 이다. 그래서 INMYIN 의 소스코드도 AGPL 로 공개한다 (README.md).
// 라이선스가 자유로운 다른 모델로 갈아타면 그때 다시 비공개로 돌릴 수 있다 (docs/roadmap.md "나중에 할 일")
export async function removeBackground(file: File): Promise<Blob> {
  // 썸네일 크기로 먼저 줄인다 — 어차피 그 크기로 저장되고, 큰 사진은 폰에서 느리고 메모리가 모자란다
  const small = await resizeImage(file, THUMBNAIL_MAX_SIDE);

  // 쓸 때에야 불러온다. 라이브러리가 커서, 미리 불러오면 모든 화면이 느려진다
  const { removeBackground: run } = await import("@imgly/background-removal");
  return run(small);
}
