// 스티커 = Noto Color Emoji 그림 파일 (public/stickers/<코드>.png, 128px). 구글이 Apache 2.0 으로 배포한다 —
// 폰의 이모지 글꼴로 찍으면 기기마다 그림이 다르고 애플 글꼴은 이미지로 뽑아 배포할 수 없어서, 그림 파일을 앱에 넣었다.
// 더 넣으려면 https://github.com/googlefonts/noto-emoji 의 2D/png/128/emoji_u<코드>.png 를 받아 여기 코드를 더한다
export const STICKERS = [
  // 얼굴
  "1f60d", "1f970", "1f929", "1f60e", "1f973", "1f979",
  // 마음
  "1f496", "2764", "1f49c", "1f49b",
  // 반짝임
  "2728", "2b50", "1f31f", "1f525", "1f389", "1f38a", "1f381",
  // 자연
  "1f33c", "1f337", "1f338", "1f340", "1f308", "2600", "1f319",
  // 취미 · 물건
  "1f3b5", "1f3a8", "1f4f8", "1f6cd", "1f45c", "1f455", "1f457", "1f460", "1f45f", "1f9f8",
  // 먹을 것
  "1f370", "2615", "1f36a", "1f35e",
  // 기타
  "1f4a4", "1f44d",
] as const;

export function stickerSrc(code: string) {
  return `/stickers/${code}.png`;
}

// 스크린리더용 이름. 코드로만 남기면 무엇인지 알 수 없어서
export function stickerLabel(code: string) {
  return String.fromCodePoint(parseInt(code, 16));
}
