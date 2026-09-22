// 정해진 앱 아이콘 SVG 하나로 PWA 에 필요한 아이콘 파일들을 만든다.
//
//   npm run app-icon -- "../SVG/inmyin logo_2.svg"
//
// 만드는 것:
//   public/icons/icon-192.png, icon-512.png   — 매니페스트용. 그린 그대로 (모서리가 투명한 둥근 네모)
//   public/icons/icon-maskable-512.png        — 안드로이드용. 바탕색을 끝까지 채우고 그림을 80% 로 줄여 가운데에 —
//                                               안드로이드는 이걸 원 · 둥근 네모 등 자기 모양으로 잘라 쓰기 때문에 가장자리에 중요한 게 있으면 안 된다
//   public/icons/apple-touch-icon.png (180)   — 아이폰 홈 화면용. 아이폰은 투명한 곳을 검게 칠하고 자기 모양으로 자르므로 바탕색을 끝까지 채운다
//   app/favicon.ico (32 + 16)                 — 브라우저 탭. ICO 안에 PNG 를 그대로 담는 방식 (요즘 브라우저는 다 읽는다)
//
// 바탕색은 SVG 의 첫 정사각형 <rect> 의 fill 에서 읽는다 (fill 이 없으면 SVG 기본값인 검정).
// 그림 변환은 sharp — Next.js 가 이미지 최적화용으로 이미 설치해 둔 것

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const svgPath = process.argv[2];
if (!svgPath) {
  console.error('사용법: npm run app-icon -- "<아이콘 SVG 경로>"');
  process.exit(1);
}
const ICONS_DIR = path.resolve("public/icons");
const FAVICON = path.resolve("app/favicon.ico");
// 안드로이드 마스크의 안전 영역은 가운데 원(지름 80%). 그림을 이만큼 줄이면 가방 몸통은 안에 들어온다
const MASKABLE_SCALE = 0.8;

const svg = await readFile(svgPath, "utf8");
const rectAttrs = [...svg.matchAll(/<rect\b([^>]*)\/?>/g)].map(([, attrs]) => attrs).find((attrs) => {
  const width = attrs.match(/\bwidth="([^"]+)"/)?.[1];
  return width && width === attrs.match(/\bheight="([^"]+)"/)?.[1];
});
const background = rectAttrs?.match(/\bfill="([^"]+)"/)?.[1] ?? "#000000";

// SVG 를 정사각형 1024px 로 한 번 그려 두고 나머지는 여기서 만든다
const base = await sharp(Buffer.from(svg)).resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

// 바탕색을 끝까지 채운 정사각형 위에 그림을 scale 만큼 줄여 가운데에 올린다
async function onSolid(size, scale) {
  const art = await sharp(base).resize(Math.round(size * scale)).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: art, gravity: "centre" }])
    .png()
    .toBuffer();
}

await mkdir(ICONS_DIR, { recursive: true });
await sharp(base).resize(192).png().toFile(path.join(ICONS_DIR, "icon-192.png"));
await sharp(base).resize(512).png().toFile(path.join(ICONS_DIR, "icon-512.png"));
await writeFile(path.join(ICONS_DIR, "icon-maskable-512.png"), await onSolid(512, MASKABLE_SCALE));
await writeFile(path.join(ICONS_DIR, "apple-touch-icon.png"), await onSolid(180, 1));

// ICO: 6바이트 머리말 + 항목마다 16바이트 목록 + PNG 본문들
const faviconSizes = [32, 16];
const pngs = await Promise.all(faviconSizes.map((size) => onSolid(size, 1)));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // 예약
header.writeUInt16LE(1, 2); // 1 = 아이콘
header.writeUInt16LE(pngs.length, 4);
const entries = [];
let offset = 6 + 16 * pngs.length;
pngs.forEach((png, i) => {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(faviconSizes[i] % 256, 0); // 너비 (256 은 0 으로 적는다)
  entry.writeUInt8(faviconSizes[i] % 256, 1); // 높이
  entry.writeUInt8(0, 2); // 팔레트 색 수 (없음)
  entry.writeUInt8(0, 3); // 예약
  entry.writeUInt16LE(1, 4); // 색 평면
  entry.writeUInt16LE(32, 6); // 픽셀당 비트
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  entries.push(entry);
  offset += png.length;
});
await writeFile(FAVICON, Buffer.concat([header, ...entries, ...pngs]));

console.log(`바탕색 ${background} 로 만들었어요:
  public/icons/icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
  app/favicon.ico`);
