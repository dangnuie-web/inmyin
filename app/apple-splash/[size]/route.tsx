import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { colorToken } from "@/lib/design-tokens";
import {
  IPHONE_SCREENS,
  SPLASH_DOT,
  SPLASH_GAP,
  SPLASH_LOGO,
  SPLASH_MARKS,
  SPLASH_STAR,
  SPLASH_SUBTITLE,
  STAR_PATH,
  STAR_VIEWBOX,
  splashFileName,
} from "@/lib/splash";

// 아이폰 시작 그림(apple-touch-startup-image) — /apple-splash/1179x2556.png 처럼 기종의 px 크기 그대로.
// 아이폰은 홈 화면 앱이 뜨는 동안 이 그림을 보여주고, 그다음 앱 안 첫 화면(components/Splash.tsx)이 같은 그림으로 이어받는다.
// 그림은 lib/splash.ts 의 값으로 next/og(이미 Next.js 에 들어 있는 그림 만들기)가 그린다. 기종 목록만큼 빌드할 때 한 번 만들어 두고,
// 목록에 없는 크기는 없다(404). 주소가 .png 로 끝나서 문지기(proxy.ts)는 건너뛴다

export const dynamicParams = false;

export function generateStaticParams() {
  return IPHONE_SCREENS.map((screen) => ({ size: splashFileName(screen) }));
}

// "In my inventory" 를 앱과 같은 Pretendard 로. next/og 는 woff2 를 못 읽어서 같은 패키지의 otf 를 쓴다
const pretendard = readFile(join(process.cwd(), "node_modules/pretendard/dist/public/static/Pretendard-Regular.otf"));
const logo = readFile(join(process.cwd(), "public", SPLASH_LOGO.src)).then((svg) => `data:image/svg+xml;base64,${svg.toString("base64")}`);

export async function GET(_request: Request, { params }: RouteContext<"/apple-splash/[size]">) {
  const { size } = await params;
  const screen = IPHONE_SCREENS.find((s) => splashFileName(s) === size);
  if (!screen) return new Response("Not found", { status: 404 });

  // 앱 안 첫 화면은 pt 로 그려지고 아이폰이 배율만큼 키운다. 그림은 처음부터 px 로 — 모든 길이에 배율을 곱한다
  const r = screen.ratio;
  const width = screen.width * r;
  const height = screen.height * r;
  const logoHeight = SPLASH_LOGO.height * r;

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor: colorToken("white"),
        }}
      >
        {SPLASH_MARKS.map((mark, i) => {
          const { size: markSize, color } = mark.kind === "dot" ? SPLASH_DOT : SPLASH_STAR;
          const px = markSize * r;
          return (
            <svg
              key={i}
              viewBox={mark.kind === "dot" ? "0 0 2 2" : STAR_VIEWBOX}
              width={px}
              height={px}
              fill={colorToken(color)}
              style={{ position: "absolute", left: (width * mark.x) / 100 - px / 2, top: (height * mark.y) / 100 - px / 2 }}
            >
              {mark.kind === "dot" ? <circle cx="1" cy="1" r="1" /> : <path d={STAR_PATH} />}
            </svg>
          );
        })}
        {/* next/og 는 inset 을 몰라서 가운데 정렬은 바깥 판이 맡는다. 판 위의 점 · 별은 absolute 라 흐름에서 빠진다 */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: SPLASH_GAP * r }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og 안의 그림은 <img> 로 넣는다 */}
          <img src={await logo} alt="" width={logoHeight * SPLASH_LOGO.aspect} height={logoHeight} />
          <span
            style={{
              fontFamily: "Pretendard",
              fontSize: SPLASH_SUBTITLE.size * r,
              lineHeight: SPLASH_SUBTITLE.lineHeight,
              color: colorToken("ink"),
            }}
          >
            {SPLASH_SUBTITLE.text}
          </span>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [{ name: "Pretendard", data: await pretendard, weight: 400, style: "normal" }],
    },
  );
}
