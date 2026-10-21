// 로그아웃할 때 이 기기의 푸시 구독을 끊는다 — 다음 사람이 이 기기로 남의 알림을 받지 않게. 시험: npm run test:push
// 브라우저 구독을 풀고(unsubscribe) 그 주소(endpoint)를 돌려준다 — 서버가 그 줄을 지운다(signOut).
// 어떤 실패에도 던지지 않는다: 서비스워커가 없음 · 구독 없음 · 멈춤 → null. 로그아웃은 늘 이어진다.
// DOM 을 직접 읽지 않는다 — navigator.serviceWorker 를 밖에서 넣어 준다(시험에서 가짜로)

type SubscriptionLike = { endpoint: string; unsubscribe(): Promise<boolean> };
type RegistrationLike = { pushManager?: { getSubscription(): Promise<SubscriptionLike | null> } };
export type ServiceWorkerLike = { getRegistration(): Promise<RegistrationLike | undefined> };

function within<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export async function forgetThisDevicePush(sw: ServiceWorkerLike | undefined, timeoutMs = 1500): Promise<string | null> {
  if (!sw) return null;
  try {
    const subscription = await within(
      (async () => {
        const reg = await sw.getRegistration();
        return (await reg?.pushManager?.getSubscription()) ?? null;
      })(),
      timeoutMs,
    );
    if (!subscription) return null;
    const endpoint = typeof subscription.endpoint === "string" ? subscription.endpoint : null;
    // 브라우저 쪽 풀기가 실패해도 서버 줄은 지운다 — 보낼 곳이 없으면 알림이 안 간다
    await within(subscription.unsubscribe().catch(() => false), timeoutMs);
    return endpoint;
  } catch {
    return null;
  }
}
