// 리포지토리에 들어 있는 앱 아이콘 시안. public/icons/candidates/<번호>.png — 번호는 1부터.
// 원본 SVG 는 리포지토리 밖(주인의 SVG 폴더)에 있고, `npm run icons` (scripts/icon-candidates.mjs) 가 여기의 PNG 를 만든다.
// 시안 수가 바뀌면 이 숫자도 맞춘다
export const BUILT_IN_COUNT = 7;

// 파일 이름이 같은 채로 그림만 바뀌므로, 배포 표식을 붙여 브라우저가 옛 그림을 다시 쓰지 않게 한다 (next.config.ts)
export function builtInSrc(n: number) {
  return `/icons/candidates/${n}.png?v=${process.env.NEXT_PUBLIC_BUILD_ID}`;
}
