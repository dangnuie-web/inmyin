import { PROMPT_EVENT, PROMPT_GLOBAL, STORAGE_KEY } from "@/lib/install-guide";

// 안드로이드 크롬은 설치할 수 있는 사이트를 열면 곧바로 beforeinstallprompt(설치 신호)를 보낸다.
// React 가 뜨기 전에 올 수 있어서, 스플래시처럼 HTML 을 읽는 도중 도는 작은 스크립트로 받아 둔다.
//   - preventDefault: 크롬이 제멋대로 띄우는 아래쪽 미니 배너를 막는다 — 우리 시트(첫 아이템 저장 직후)에서 쓴다
//   - 받은 신호는 window 에 보관하고, 왔다고 알린다 (lib/install-guide.ts 의 installPrompt)
//   - 설치가 끝나면(appinstalled) 신호를 버리고 설치 안내를 다시 띄우지 않게 적는다
const CATCHER = `try{var w=window,g=${JSON.stringify(PROMPT_GLOBAL)},v=${JSON.stringify(PROMPT_EVENT)},k=${JSON.stringify(STORAGE_KEY)};w.addEventListener("beforeinstallprompt",function(e){e.preventDefault();w[g]=e;w.dispatchEvent(new Event(v))});w.addEventListener("appinstalled",function(){w[g]=null;try{var s=JSON.parse(localStorage.getItem(k)||"{}")||{};s.never=true;localStorage.setItem(k,JSON.stringify(s))}catch(e){}w.dispatchEvent(new Event(v))})}catch(e){}`;

export function InstallPromptCatcher() {
  return (
    <script
      // React 가 화면을 다시 그릴 때는 실행하지 않게 (Splash.tsx 의 SplashSwitch 와 같은 방식). 처음 HTML 에서만 돈다
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: CATCHER }}
    />
  );
}
