import Image from "next/image";
import {
  SPLASH_DOT,
  SPLASH_FADE_MS,
  SPLASH_GAP,
  SPLASH_HOLD_MS,
  SPLASH_LOGO,
  SPLASH_MARKS,
  SPLASH_STAR,
  SPLASH_SUBTITLE,
  STAR_PATH,
  STAR_VIEWBOX,
} from "@/lib/splash";

// 스플래시(S-00) — 홈 화면 앱(주소창 없는 standalone)을 열 때 화면 전체를 잠깐 덮는 판.
// 평소엔 꺼져 있고(display: none), 아래 SplashSwitch 의 스크립트가 "홈 화면 앱 + 이번에 처음 연 것"일 때만 html 에 splash-on 을 붙여 켠다.
// 켜진 판은 CSS 애니메이션만으로 SPLASH_HOLD_MS 뒤 흐려지며 사라진다 — 자바스크립트(React)가 뜨기 전에도 정해진 시간에 걷힌다.
// 브라우저로 그냥 들어온 사람에게는 처음부터 꺼진 채라 보이지 않는다.
// 모양 값은 lib/splash.ts — 아이폰 시작 그림(app/apple-splash)과 같은 그림이다
export function Splash() {
  return (
    <div
      aria-hidden
      className="splash fixed inset-0 z-[100] bg-white"
      style={{ "--splash-hold": `${SPLASH_HOLD_MS}ms`, "--splash-fade": `${SPLASH_FADE_MS}ms` } as React.CSSProperties}
    >
      {SPLASH_MARKS.map((mark, i) => {
        const { size, color } = mark.kind === "dot" ? SPLASH_DOT : SPLASH_STAR;
        return (
          <svg
            key={i}
            viewBox={mark.kind === "dot" ? "0 0 2 2" : STAR_VIEWBOX}
            width={size}
            height={size}
            className="absolute"
            style={{
              left: `calc(${mark.x}% - ${size / 2}px)`,
              top: `calc(${mark.y}% - ${size / 2}px)`,
              fill: `var(--color-${color})`,
            }}
          >
            {mark.kind === "dot" ? <circle cx="1" cy="1" r="1" /> : <path d={STAR_PATH} />}
          </svg>
        );
      })}

      {/* 로고와 한 줄. 아이폰은 시작 그림이 상태 표시줄까지 포함한 화면 한가운데에 그려져 있어서,
          상태 표시줄 아래부터 시작하는 이 판에서는 그 높이의 반만큼 올려야 같은 자리에 온다 (--splash-shift, 스크립트가 잰다) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ gap: SPLASH_GAP, transform: "translateY(calc(var(--splash-shift, 0px) * -1))" }}
      >
        <Image
          src={SPLASH_LOGO.src}
          alt=""
          width={Math.round(SPLASH_LOGO.height * SPLASH_LOGO.aspect)}
          height={SPLASH_LOGO.height}
          loading="eager"
          style={{ width: "auto", height: SPLASH_LOGO.height }}
        />
        <span style={{ fontSize: SPLASH_SUBTITLE.size, lineHeight: SPLASH_SUBTITLE.lineHeight }}>{SPLASH_SUBTITLE.text}</span>
      </div>
    </div>
  );
}

// 스플래시를 켤지 정하는 작은 스크립트. 화면을 그리기 전에(HTML 을 읽는 도중) 바로 실행돼야 깜빡이지 않는다 — Next.js 가이드
// "Preventing flash before hydration" 의 인라인 스크립트 방식. 켤 때:
//   - 홈 화면 앱으로 열었을 때만 (아이폰은 navigator.standalone, 안드로이드는 display-mode: standalone)
//   - 이번 세션에 처음일 때만 (sessionStorage). 로그인하고 돌아오는 등 앱 안에서 새로 고칠 때는 다시 뜨지 않는다
// 아이폰이면 화면 높이 - 보이는 높이(= 상태 표시줄)의 반을 --splash-shift 로 넘긴다 (위 설명)
const SWITCH = `try{var d=document.documentElement,n=navigator,k="inmyin-splash";if((n.standalone||matchMedia("(display-mode: standalone)").matches)&&!sessionStorage.getItem(k)){sessionStorage.setItem(k,"1");if(n.standalone===true){d.style.setProperty("--splash-shift",Math.max(0,Math.min(80,screen.height-innerHeight))/2+"px")}d.classList.add("splash-on")}}catch(e){}`;

export function SplashSwitch() {
  return (
    <script
      // React 가 화면을 다시 그릴 때는 이 스크립트를 실행하지 않게 (가이드의 InlineScript 방식). 처음 HTML 에서만 돈다
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: SWITCH }}
    />
  );
}
