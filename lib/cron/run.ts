// 하루 한 번 예약 실행(/api/cron/daily)의 일들을 차례로 돌린다. 시험: npm run test:cron
// 하나가 실패(예외 · 멈춤)해도 다음 일은 돈다. 결과는 일마다 { ok, result } 또는 { ok: false, error }.
// 아무것도 불러오지 않는다 — node --test 로 바로 돈다

export type CronStep = { name: string; run: () => Promise<unknown> };
export type CronStepResult = { name: string; ok: true; result: unknown } | { name: string; ok: false; error: string };

export async function runSteps(steps: CronStep[], timeoutMs = 60_000): Promise<CronStepResult[]> {
  const results: CronStepResult[] = [];
  for (const step of steps) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      });
      const result = await Promise.race([step.run(), timeout]);
      results.push({ name: step.name, ok: true, result });
    } catch (error) {
      // 에러 글에 비밀 값이 섞일 수 있어 이름 · 짧은 글만
      const message = error instanceof Error ? error.message : String(error);
      results.push({ name: step.name, ok: false, error: message.slice(0, 200) });
    } finally {
      clearTimeout(timer);
    }
  }
  return results;
}
