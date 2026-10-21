"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadPushKinds, removePushSubscription, savePushSubscription, updatePushKinds } from "@/app/(flow)/my/settings/notifications/actions";
import { InstallGuideSettingsRow } from "@/components/InstallGuide";
import { Switch } from "@/components/ui/Switch";
import { Toast } from "@/components/ui/Toast";
import { currentInstallEnv } from "@/lib/install-guide";
import { PUSH_KIND_LABELS, PUSH_KINDS, type PushKind } from "@/lib/push/messages";
import { deniedHelp, keyToBytes, pushState, type PushEnv, type PushState } from "@/lib/push/support";

// 설정 › 알림의 몸통. 맨 위 "이 기기에서 알림 받기" 하나를 켜야 아래 종류별 스위치가 나온다.
// 알림 권한은 켤 때만 묻는다 — 화면을 열기만 해서는 묻지 않는다.
// 아이폰은 홈 화면에 추가한 앱에서만 웹 푸시가 된다. 사파리 탭이면 안내와 "홈 화면에 추가" 버튼

const ROW_CLASS = "flex h-12 w-full items-center justify-between border-b border-gray-3 text-body";
// 서비스워커가 준비되길 기다리는 시간. 개발 중(npm run dev)에는 서비스워커가 없어서 영영 안 온다
const SW_WAIT_MS = 4000;

export type Loaded = { state: PushState; env: PushEnv; subscription: PushSubscription | null; kinds: PushKind[] | null };

function readEnv(publicKey: string): PushEnv {
  const install = currentInstallEnv();
  const ua = navigator.userAgent;
  return {
    install: install.kind,
    ios: /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1),
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    permission: "Notification" in window ? Notification.permission : "default",
    hasKey: publicKey.length > 0,
  };
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_WAIT_MS));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

export function PushSettings({ publicKey }: { publicKey: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);
  const kindSeq = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const env = readEnv(publicKey);
      const state = pushState(env);
      if (state !== "ready") {
        if (alive) setLoaded({ state, env, subscription: null, kinds: null });
        return;
      }
      const reg = await registration();
      if (!reg) {
        if (alive) setLoaded({ state: "unsupported", env, subscription: null, kinds: null });
        return;
      }
      const subscription = await reg.pushManager.getSubscription();
      // 권한이 살아 있고 서버에도 내 줄이 있어야 켜진 것
      const kinds = subscription && env.permission === "granted" ? await loadPushKinds(subscription.endpoint) : null;
      if (alive) setLoaded({ state, env, subscription, kinds });
    })().catch(() => {
      if (alive) setLoaded({ state: "unsupported", env: readEnv(publicKey), subscription: null, kinds: null });
    });
    return () => {
      alive = false;
    };
  }, [publicKey]);

  if (!loaded) return <p className="px-5 pt-6 text-caption text-ink-muted">불러오는 중…</p>;

  async function turnOn(current: Loaded) {
    // 여기서 처음 권한을 묻는다
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setLoaded({ ...current, state: permission === "denied" ? "denied" : current.state, env: { ...current.env, permission } });
      if (permission !== "denied") setNotice("알림을 허용해야 받을 수 있어요.");
      return;
    }
    const reg = await registration();
    if (!reg) throw new Error("no service worker");
    const subscription = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
    const json = subscription.toJSON();
    const result = await savePushSubscription({ endpoint: subscription.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" });
    if (result.error || !result.kinds) {
      // 서버에 못 적었으면 기기 쪽도 되돌린다 — 켜진 척하지 않게
      await subscription.unsubscribe().catch(() => {});
      setNotice(result.error ?? "알림을 켜지 못했어요.");
      return;
    }
    setLoaded({ ...current, env: { ...current.env, permission }, subscription, kinds: result.kinds });
  }

  async function turnOff(current: Loaded) {
    const subscription = current.subscription;
    if (subscription) {
      const result = await removePushSubscription(subscription.endpoint);
      if (result.error) {
        setNotice(result.error);
        return;
      }
      await subscription.unsubscribe().catch(() => {});
    }
    setLoaded({ ...current, subscription: null, kinds: null });
  }

  function toggleMain(next: boolean) {
    if (busy || !loaded) return;
    const current = loaded;
    setBusy(true);
    (next ? turnOn(current) : turnOff(current))
      .catch(() => setNotice(next ? "알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요." : "알림을 끄지 못했어요. 잠시 후 다시 시도해 주세요."))
      .finally(() => setBusy(false));
  }

  // 종류 스위치는 화면부터 바꾸고 저장한다 — 실패하면 되돌린다
  function toggleKind(kind: PushKind, next: boolean) {
    if (!loaded?.subscription || !loaded.kinds) return;
    const previous = loaded.kinds;
    const kinds = next ? PUSH_KINDS.filter((k) => k === kind || previous.includes(k)) : previous.filter((k) => k !== kind);
    const seq = ++kindSeq.current;
    setLoaded({ ...loaded, kinds });
    updatePushKinds(loaded.subscription.endpoint, kinds).then((result) => {
      if (!result.error || seq !== kindSeq.current) return;
      setLoaded((now) => (now ? { ...now, kinds: previous } : now));
      setNotice(result.error);
    });
  }

  return (
    <>
      <PushSettingsView loaded={loaded} onMain={toggleMain} onKind={toggleKind} />
      <Toast message={notice} onDone={hideNotice} />
    </>
  );
}

// 그리는 것만. 상태는 위에서 받는다 — 디자인 확인 화면도 이걸 그대로 그린다
export function PushSettingsView({ loaded, onMain, onKind }: { loaded: Loaded; onMain: (next: boolean) => void; onKind: (kind: PushKind, next: boolean) => void }) {
  const on = loaded.kinds !== null;
  return (
    <div className="flex flex-col px-5">
      <p className="break-keep pt-4 text-caption text-ink-muted">팔로우 · 하트 · 댓글 · 유통기한 소식을 이 기기로 알려 드려요. 끄더라도 앱 안의 알림(종)에는 그대로 쌓여요.</p>

      {loaded.state === "ready" && (
        <>
          <div className={`${ROW_CLASS} mt-4 font-bold`}>
            이 기기에서 알림 받기
            <Switch checked={on} onChange={onMain} label="이 기기에서 알림 받기" />
          </div>
          {on && (
            <section className="mt-6 flex flex-col">
              <h2 className="flex h-10 items-center text-link font-bold">받을 알림</h2>
              {PUSH_KINDS.map((kind) => (
                <div key={kind} className={ROW_CLASS}>
                  {PUSH_KIND_LABELS[kind]}
                  <Switch checked={loaded.kinds?.includes(kind) ?? false} onChange={(next) => onKind(kind, next)} label={`${PUSH_KIND_LABELS[kind]} 알림`} />
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {loaded.state === "ios-tab" && (
        <Notice title="홈 화면에 추가하면 알림을 받을 수 있어요">
          아이폰은 사파리 탭에서는 알림을 받을 수 없어요. 홈 화면에 INMYIN 을 추가한 뒤, 그 앱에서 여기로 와서 켜 주세요.
          <InstallGuideSettingsRow className="mt-4 flex h-10 w-full items-center justify-center rounded-sm bg-ink text-label font-bold text-white active:opacity-80" />
        </Notice>
      )}

      {loaded.state === "inapp" && (
        <Notice title="이 화면에서는 알림을 켤 수 없어요">카카오톡 · 인스타그램 같은 앱 안에서 열린 화면이에요. 사파리나 크롬으로 열어 홈 화면에 추가한 뒤 켜 주세요.</Notice>
      )}

      {loaded.state === "denied" && <Notice title="알림이 막혀 있어요">{deniedHelp(loaded.env)} 허용한 뒤 이 화면을 다시 열면 켤 수 있어요.</Notice>}

      {loaded.state === "unsupported" && <Notice title="지금은 알림을 켤 수 없어요">이 브라우저는 알림을 지원하지 않거나 아직 준비 중이에요. 잠시 후 다시 열어 주세요.</Notice>}

    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-md border border-gray-3 p-4">
      <p className="break-keep text-label font-bold">{title}</p>
      <div className="mt-1 break-keep text-caption text-ink-muted">{children}</div>
    </div>
  );
}
