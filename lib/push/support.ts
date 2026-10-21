// 이 기기에서 푸시를 켤 수 있는가 — 설정 › 알림(components/push/PushSettings.tsx)이 무엇을 보여줄지 정한다.
// DOM 을 읽지 않는 순수 함수. 시험(support.test.mjs)이 그대로 부른다

export type PushEnv = {
  // lib/install-guide.ts 의 판별 결과 종류
  install: "installed" | "ios" | "android" | "inapp" | "unsupported";
  // 아이폰 · 아이패드인가 (설치된 앱이어도)
  ios: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  permission: "default" | "granted" | "denied";
  hasKey: boolean;
};

export type PushState =
  // 아이폰 사파리 탭 — 홈 화면에 추가한 앱에서만 된다
  | "ios-tab"
  // 카톡 · 인스타 같은 앱 안 브라우저
  | "inapp"
  // 이 브라우저는 웹 푸시가 없다
  | "unsupported"
  // 사용자가 알림을 막았다 — 기기 · 브라우저 설정에서 풀어야 한다
  | "denied"
  // 켜고 끌 수 있다
  | "ready";

export function pushState(env: PushEnv): PushState {
  if (env.install === "ios") return "ios-tab";
  if (env.install === "inapp") return "inapp";
  if (!env.hasKey || !env.hasServiceWorker || !env.hasPushManager || !env.hasNotification) return "unsupported";
  if (env.permission === "denied") return "denied";
  return "ready";
}

// 막혔을 때 어디서 풀지
export function deniedHelp(env: Pick<PushEnv, "install" | "ios">): string {
  if (env.ios) return "아이폰 설정 › 알림 › INMYIN 에서 알림 허용을 켜 주세요.";
  if (env.install === "installed" || env.install === "android") return "휴대폰 설정 › 애플리케이션 › INMYIN(또는 Chrome) › 알림에서 허용해 주세요.";
  return "주소창 왼쪽의 사이트 설정에서 알림을 허용해 주세요.";
}

// VAPID 공개 키(base64url) → 브라우저가 받는 바이트
export function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
