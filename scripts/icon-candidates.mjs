// 주인의 SVG 폴더에 있는 앱 아이콘 시안을 512px PNG 로 만들어 public/icons/candidates/ 에 넣는다.
// /design/icons 가 이 PNG 들을 보여준다 (app/design/icons/candidates.ts).
//
//   npm run icons              ← 프로젝트 옆의 ../SVG 폴더를 읽는다
//   npm run icons -- <폴더>     ← 다른 폴더
//
// 파일 순서가 곧 번호다: "inmyin logo.svg" 가 1번, "inmyin logo_1.svg" 가 2번, … (이름 끝의 숫자 순).
// 시안이 아이콘 네모(1024×1024) 밖으로 삐져나와 있으면 네모만 잘라낸다 — SVG 안의 첫 정사각형 <rect> 를 네모로 본다.
// 그림 변환은 sharp — Next.js 가 이미지 최적화용으로 이미 설치해 둔 것이라 따로 받을 게 없다.

import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SIDE = 512;
const OUT_DIR = path.resolve("public/icons/candidates");
const inputDir = path.resolve(process.argv[2] ?? "../SVG");

// "inmyin logo_3.svg" → 3, "inmyin logo.svg" → 0
function orderOf(fileName) {
  return Number(fileName.match(/_(\d+)\.svg$/i)?.[1] ?? 0);
}

// SVG 를 그렸을 때의 크기(viewBox)와, 아이콘 네모의 위치
function readLayout(svg) {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);
  const rects = [...svg.matchAll(/<rect\b([^>]*)\/?>/g)].map(([, attrs]) => {
    const get = (name) => Number(attrs.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1] ?? 0);
    return { x: get("x"), y: get("y"), width: get("width"), height: get("height") };
  });
  const square = rects.find((r) => r.width > 0 && r.width === r.height);
  return { viewBox, square };
}

const files = (await readdir(inputDir)).filter((f) => f.toLowerCase().endsWith(".svg")).sort((a, b) => orderOf(a) - orderOf(b));
if (files.length === 0) {
  console.error(`SVG 파일이 없어요: ${inputDir}`);
  process.exit(1);
}
await mkdir(OUT_DIR, { recursive: true });

for (const [i, file] of files.entries()) {
  const svg = await readFile(path.join(inputDir, file), "utf8");
  const { viewBox, square } = readLayout(svg);
  const rendered = await sharp(Buffer.from(svg)).png().toBuffer();
  const { width, height } = await sharp(rendered).metadata();

  // viewBox 단위 → 그려진 픽셀 단위 (보통 1:1)
  const scale = viewBox ? width / viewBox[2] : 1;
  const crop = square
    ? { left: Math.round(square.x * scale), top: Math.round(square.y * scale), size: Math.round(square.width * scale) }
    : { left: 0, top: 0, size: Math.min(width, height) };
  crop.size = Math.min(crop.size, width - crop.left, height - crop.top);

  const out = path.join(OUT_DIR, `${i + 1}.png`);
  await sharp(rendered)
    .extract({ left: crop.left, top: crop.top, width: crop.size, height: crop.size })
    .resize(SIDE, SIDE)
    .png()
    .toFile(out);

  const note = crop.left || crop.top || crop.size !== width || crop.size !== height ? ` (네모만 잘라냄: ${crop.left},${crop.top} ${crop.size}px)` : "";
  console.log(`${i + 1}번 ← ${file} ${width}×${height}${note}`);
}
console.log(`\n${files.length}개를 ${path.relative(process.cwd(), OUT_DIR)}/ 에 넣었어요. app/design/icons/candidates.ts 의 BUILT_IN_COUNT 가 ${files.length} 인지 확인하세요.`);
