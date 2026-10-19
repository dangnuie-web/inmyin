// 설치 안내 — "홈 화면에 INMYIN을 꽂아 두세요" 바텀시트의 판별 · 띄우는 규칙 · 문구를 한곳에 둔다.
// 설계: 오피스 inmyin/디자인/설치안내/20261019_inmyin_설치안내설계_v01.md (2026-10-19 당니님 추천안 확정)
//   components/InstallGuide.tsx            시트 · 자동 띄움(인벤토리 상세) · 설정 줄
//   components/InstallPromptCatcher.tsx    안드로이드 크롬의 설치 신호(beforeinstallprompt)를 일찍 받아 두는 스크립트
// 값을 바꿀 때는 이 파일만 고치면 된다 (스플래시의 lib/splash.ts 와 같은 방식)

// ── 띄우는 규칙 ───────────────────────────────────────────────

// 자동으로 띄우는 최대 횟수. 그 뒤로는 설정 › 일반 › "홈 화면에 추가"로만 연다
export const AUTO_MAX_SHOWS = 2;
// 두 번째는 첫 번째를 닫은 뒤 이만큼 지나고 아이템을 저장할 때
export const AUTO_REOPEN_AFTER_DAYS = 3;
// 아이템을 저장하고 인벤토리 상세에 도착한 뒤 시트가 올라오기까지 (ms).
// 새 칸의 slot-pop(0.5s)이 끝나고 0.7초 쉬었다가 — 칸이 꽂히는 걸 먼저 보여 주고 그다음에 말을 건다
export const AUTO_DELAY_MS = 1200;

// 시트가 올라오는 시간 · 딤이 짙어지는 시간 (ms). 곡선은 slot-pop 과 같다. 닫힐 때도 같은 시간으로 내려간다
export const SHEET_SLIDE_MS = 320;
export const DIM_FADE_MS = 280;
export const SHEET_EASE = "cubic-bezier(0.2, 0.9, 0.3, 1)";
// 칸 그림의 INMYIN 아이콘이 "톡" 꽂히는 때 · 이름이 나타나는 때 (시트가 올라오기 시작한 뒤, ms)
export const SHELF_ICON_DELAY_MS = 300;
export const SHELF_NAME_DELAY_MS = 600;
// 시트를 아래로 이만큼(px) 끌어내리고 놓으면 닫힌다
export const SWIPE_CLOSE_PX = 80;

// 기록 자리. localStorage 는 기기에 계속 남고, sessionStorage 는 탭을 닫으면 지워진다 (한 세션에 한 번까지)
export const STORAGE_KEY = "inmyin-install-guide";
export const SESSION_KEY = "inmyin-install-guide-session";
// 안드로이드 크롬이 보낸 설치 신호를 담아 두는 전역 이름과, 신호가 왔다고 알리는 이벤트 이름 (InstallPromptCatcher)
export const PROMPT_GLOBAL = "__inmyinInstallPrompt";
export const PROMPT_EVENT = "inmyin-installprompt";

// ── 기록 ─────────────────────────────────────────────────────

// shown: 자동으로 뜬 시트를 닫은 횟수 (설정에서 직접 연 것은 세지 않는다) · lastAt: 마지막으로 닫은 때 · never: "다시 보지 않기"(또는 설치함)
export type GuideRecord = { shown: number; lastAt: string | null; never: boolean };

const EMPTY_RECORD: GuideRecord = { shown: 0, lastAt: null, never: false };

export function readRecord(): GuideRecord {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return EMPTY_RECORD;
    return {
      shown: typeof saved.shown === "number" ? saved.shown : 0,
      lastAt: typeof saved.lastAt === "string" ? saved.lastAt : null,
      never: saved.never === true,
    };
  } catch {
    return EMPTY_RECORD;
  }
}

function writeRecord(record: GuideRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // 사생활 보호 모드 등으로 못 쓰면 그냥 넘어간다 — 그 세션에서만 한 번 뜨고 끝
  }
}

// 사용자가 시트를 닫은 방법에 따라 기록을 고친다 (설계서 2-3)
//   dismissed — 알겠어요 · 닫기(×) · 딤 · 아래로 쓸기 · 나중에 · 설치 창에서 취소 → 한 번 본 것으로
//   never     — 다시 보지 않기 · 설치함 → 자동으로는 다시 안 뜸
//   handoff   — 인앱의 "Safari로 열기" · "주소 복사" → 그대로 (사파리에서 처음부터 다시 판단)
export type CloseReason = "dismissed" | "never" | "handoff";

export function recordClose(reason: CloseReason, now = new Date()) {
  if (reason === "handoff") return;
  const record = readRecord();
  if (reason === "never") return writeRecord({ ...record, never: true });
  writeRecord({ ...record, shown: record.shown + 1, lastAt: now.toISOString() });
}

// 자동으로 띄워도 되는 기록인가. 처음이거나, 한 번 닫고 3일이 지났을 때. "다시 보지 않기"면 안 된다
export function autoAllowed(record: GuideRecord, now = new Date()) {
  if (record.never || record.shown >= AUTO_MAX_SHOWS) return false;
  if (record.shown === 0) return true;
  if (!record.lastAt) return true;
  const elapsed = now.getTime() - new Date(record.lastAt).getTime();
  return elapsed >= AUTO_REOPEN_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

// ── 환경 판별 (설계서 2-1, 위에서부터 첫 번째 맞는 것) ──────────────

export type InstallEnv =
  // 이미 홈 화면 앱으로 열었다 — 안 띄우고 설정 줄도 숨김
  | { kind: "installed" }
  // 데스크톱(또는 알 수 없는 기기) — 안 띄우고 설정 줄도 숨김
  | { kind: "unsupported" }
  // 카카오톡 같은 앱 안의 화면 — "Safari에서 열어야" 판
  | { kind: "inapp"; app: string | null; os: "ios" | "android"; kakao: boolean }
  // 아이폰 · 아이패드. ios26 은 사파리 26 이상(··· 메뉴 안에 공유), ios18 은 그 아래. otherBrowser 는 크롬 · 파이어폭스 · 엣지
  | { kind: "ios"; panel: "ios26" | "ios18"; otherBrowser: boolean }
  // 안드로이드. canPrompt 는 크롬이 설치 신호를 보냈는지 — 보냈을 때만 자동으로 띄운다
  | { kind: "android"; canPrompt: boolean };

export type EnvSignals = {
  userAgent: string;
  // navigator.standalone 또는 display-mode: standalone
  standalone: boolean;
  maxTouchPoints: number;
  hasPrompt: boolean;
};

// 앱 안 브라우저. 사용자에게 보여 줄 앱 이름과 함께
const IN_APP: { pattern: RegExp; name: string }[] = [
  { pattern: /KAKAOTALK/i, name: "카카오톡" },
  { pattern: /Instagram/, name: "인스타그램" },
  { pattern: /FBAN|FBAV/, name: "페이스북" },
  { pattern: /NAVER\(inapp/, name: "네이버" },
  { pattern: /Line\//, name: "라인" },
];

// 이 버전 이상의 사파리는 공유가 ··· 메뉴 안에 있다. iOS 26 부터 UA 의 OS 버전은 18_6 으로 고정이라 Version/ 뒤 숫자(사파리 버전)로 본다
const IOS_NEW_SAFARI_VERSION = 26;

export function detectInstallEnv(signals: EnvSignals): InstallEnv {
  const ua = signals.userAgent;
  if (signals.standalone) return { kind: "installed" };

  // 아이패드는 데스크톱 사이트 모드라 맥처럼 보인다 — 터치가 되면 아이패드로 본다
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && signals.maxTouchPoints > 1);
  const android = /Android/.test(ua);

  const inApp = IN_APP.find(({ pattern }) => pattern.test(ua));
  if (inApp && (ios || android)) {
    return { kind: "inapp", app: inApp.name, os: ios ? "ios" : "android", kakao: inApp.name === "카카오톡" };
  }
  if (ios) {
    if (/CriOS|FxiOS|EdgiOS/.test(ua)) return { kind: "ios", panel: "ios18", otherBrowser: true };
    const version = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0);
    return { kind: "ios", panel: version >= IOS_NEW_SAFARI_VERSION ? "ios26" : "ios18", otherBrowser: false };
  }
  if (android) return { kind: "android", canPrompt: signals.hasPrompt };
  // 아이폰도 안드로이드도 아니면 데스크톱. 설계서는 pointer: coarse 로 데스크톱을 가리지만,
  // 그 밖의 손가락 기기(윈도 태블릿 등)도 안내할 문구가 없어 같이 숨긴다
  return { kind: "unsupported" };
}

// 지금 브라우저에서 판별 (브라우저에서만 부른다)
export function currentInstallEnv(): InstallEnv {
  const nav = navigator as Navigator & { standalone?: boolean };
  return detectInstallEnv({
    userAgent: nav.userAgent,
    standalone: nav.standalone === true || matchMedia("(display-mode: standalone)").matches,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    hasPrompt: Boolean(installPrompt()),
  });
}

// 설정 줄을 보여 줄 환경인가 (설치된 앱 · 데스크톱은 숨김)
export function canGuide(env: InstallEnv) {
  return env.kind !== "installed" && env.kind !== "unsupported";
}

// 자동으로 띄울 환경인가. 안드로이드는 크롬이 설치 신호를 보냈을 때만
export function canAutoGuide(env: InstallEnv) {
  if (env.kind === "android") return env.canPrompt;
  return canGuide(env);
}

// ── 안드로이드 설치 신호 ─────────────────────────────────────────

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function installPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as Record<string, unknown>)[PROMPT_GLOBAL] as BeforeInstallPromptEvent | undefined) ?? null;
}

// 한 번 쓴 신호는 다시 못 쓴다 (크롬 규칙)
export function forgetInstallPrompt() {
  (window as unknown as Record<string, unknown>)[PROMPT_GLOBAL] = null;
  window.dispatchEvent(new Event(PROMPT_EVENT));
}

// ── 문구 (설계서 4절) ──────────────────────────────────────────

// 단계 한 줄은 글자와 칩(버튼 이름)이 섞여 있다. 칩 아이콘 그림은 components/InstallGuide.tsx
export type ChipIcon = "share" | "more" | "moreVertical" | "plus";
export type StepPart = string | { chip: string | null; icon?: ChipIcon };

// 시트의 버튼이 하는 일
//   okBand — 아이폰 판의 "알겠어요". 닫으면서 화면 위쪽 안내 띠로 줄어든다 (아래 "안내 띠")
export type GuideAction = "ok" | "okBand" | "never" | "later" | "install" | "openExternal" | "copy";

export type GuideContent = {
  // 시트 위쪽의 칸 그림 (빈 칸 사이에 INMYIN 아이콘이 꽂히는 그림). 인앱 판에는 없다
  shelf: boolean;
  title: string;
  body: string;
  steps: StepPart[][] | null;
  note: string | null;
  primary: { label: string; action: GuideAction } | null;
  secondary: { label: string; action: GuideAction } | null;
  quiet: { label: string; action: GuideAction } | null;
};

export const GUIDE_TITLE = "홈 화면에 INMYIN을 꽂아 두세요";
const IOS_BODY = "주소창 없이, 앱처럼 바로 열려요.";
const ANDROID_BODY = "홈 화면과 앱 목록에 INMYIN이 생겨요.";
const OK = { label: "알겠어요", action: "ok" } as const;
const NEVER = { label: "다시 보지 않기", action: "never" } as const;

const ADD_TO_HOME = { chip: "홈 화면에 추가", icon: "plus" } as const;

export function guideContent(env: InstallEnv): GuideContent {
  if (env.kind === "inapp") {
    const browser = env.os === "ios" ? "Safari" : "Chrome";
    const where = env.app ? `${env.app} 안의 화면에서는` : "이 앱 안의 화면에서는";
    return {
      shelf: false,
      title: `${browser}에서 열어야 추가할 수 있어요`,
      body: `${where} 홈 화면에 추가가 안 돼요. ${browser}${env.os === "ios" ? "로" : "으로"} 옮겨서 이어 주세요.`,
      steps: null,
      note: null,
      // 바깥 브라우저로 바로 여는 길은 카카오톡에만 있다. 다른 앱은 주소 복사만
      primary: env.kakao ? { label: `${browser}${env.os === "ios" ? "로" : "으로"} 열기`, action: "openExternal" } : null,
      secondary: { label: "주소 복사", action: "copy" },
      quiet: null,
    };
  }

  if (env.kind === "android") {
    if (env.canPrompt) {
      return {
        shelf: true,
        title: GUIDE_TITLE,
        body: ANDROID_BODY,
        steps: null,
        note: null,
        primary: { label: "앱 설치", action: "install" },
        secondary: { label: "나중에", action: "later" },
        quiet: null,
      };
    }
    // 설정에서 열었는데 크롬의 설치 신호가 없을 때 (삼성 인터넷 · 이미 설치함 등) — 메뉴로 안내
    return {
      shelf: true,
      title: GUIDE_TITLE,
      body: ANDROID_BODY,
      steps: [["오른쪽 위", { chip: null, icon: "moreVertical" }, "→", { chip: "홈 화면에 추가" }]],
      note: null,
      primary: OK,
      secondary: null,
      quiet: null,
    };
  }

  // 아이폰 · 아이패드
  const panel = env.kind === "ios" ? env.panel : "ios18";
  const otherBrowser = env.kind === "ios" && env.otherBrowser;
  const steps: StepPart[][] =
    panel === "ios26"
      ? [
          ["주소창 옆", { chip: null, icon: "more" }, "누르고", { chip: "공유", icon: "share" }],
          ["목록을 내려", ADD_TO_HOME],
          ["‘웹 앱으로 열기’ 켠 채", { chip: "추가" }],
        ]
      : [
          [otherBrowser ? "주소창 오른쪽" : "아래 막대의", { chip: "공유", icon: "share" }],
          ["목록을 내려", ADD_TO_HOME],
          ["오른쪽 위", { chip: "추가" }],
        ];
  return {
    shelf: true,
    title: GUIDE_TITLE,
    body: IOS_BODY,
    steps,
    // iOS 26 사파리에서 기본 탭 모양이 아닌 사람은 공유 버튼이 바로 보인다
    note: panel === "ios26" ? "공유 버튼이 바로 보이면 그걸 눌러도 돼요." : null,
    primary: { label: "알겠어요", action: "okBand" },
    secondary: null,
    quiet: NEVER,
  };
}

// 인앱에서 "주소 복사"를 누른 뒤의 안내
export function copiedNotice(env: InstallEnv) {
  const browser = env.kind === "inapp" && env.os === "android" ? "Chrome" : "Safari";
  return `주소를 복사했어요. ${browser}에 붙여 넣어 주세요.`;
}
export const COPY_FAILED_NOTICE = "주소를 복사하지 못했어요.";

// 카카오톡 안에서 바깥 브라우저로 여는 주소
export function kakaoOpenExternalUrl(url: string) {
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
}

// ── 안내 띠 (2026-10-19 당니님 결정) ─────────────────────────────
// 아이폰은 판을 닫아야 사파리 메뉴를 누를 수 있어서, "알겠어요"를 누르면 판이 화면 위쪽의 얇은 띠로 줄어 단계를 남긴다.
// 사파리 메뉴 막대가 아래에 있어서 위에 둔다. 같은 탭에서는 화면을 옮기거나 새로 고쳐도 남고(sessionStorage),
// × 를 누르거나 설치한 앱으로 열면 사라진다. × 는 "알겠어요"가 이미 적은 기록 그대로 — 따로 세지 않는다.
// 안드로이드 · 인앱 판에는 띠가 없다

export type BandPanel = "ios26" | "ios18";
export const BAND_KEY = "inmyin-install-band";
export const BAND_EVENT = "inmyin-install-band";

// 띠에 쓰는 단계 — 판의 칩을 그대로 다시 쓴다. 칩 사이에는 "→"
export function bandSteps(panel: BandPanel): StepPart[] {
  return panel === "ios26"
    ? [{ chip: null, icon: "more" }, { chip: "공유", icon: "share" }, ADD_TO_HOME]
    : [{ chip: "공유", icon: "share" }, ADD_TO_HOME];
}

export function bandPanelFor(env: InstallEnv): BandPanel | null {
  return env.kind === "ios" ? env.panel : null;
}

export function readBand(): BandPanel | null {
  try {
    const saved = sessionStorage.getItem(BAND_KEY);
    return saved === "ios26" || saved === "ios18" ? saved : null;
  } catch {
    return null;
  }
}

function setBand(panel: BandPanel | null) {
  try {
    if (panel) sessionStorage.setItem(BAND_KEY, panel);
    else sessionStorage.removeItem(BAND_KEY);
  } catch {
    // 사생활 보호 모드 등으로 못 쓰면 띠가 남지 않는다 — 판은 이미 닫혔고 설정 줄로 다시 볼 수 있다
  }
  window.dispatchEvent(new Event(BAND_EVENT));
}

export function showBand(panel: BandPanel) {
  setBand(panel);
}

export function hideBand() {
  setBand(null);
}
