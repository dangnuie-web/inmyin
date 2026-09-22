// 리포지토리에 들어 있는 앱 아이콘 시안. public/icons/candidates/<번호>.png — 번호는 1부터.
// 원본 SVG 는 리포지토리 밖(주인의 SVG 폴더)에 있고, 여기에는 512px PNG 만 둔다
export const BUILT_IN_COUNT = 7;

export function builtInSrc(n: number) {
  return `/icons/candidates/${n}.png`;
}
