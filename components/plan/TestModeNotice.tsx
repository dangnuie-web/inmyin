// 연습용 결제 알림. 4단계는 토스페이먼츠 테스트 키라 카드 정보를 넣어도 청구되지 않는다 — 결제 화면마다 맨 위에 둔다.
// 흑백 규칙이라 색 없이 회색 상자 + 굵은 한 줄. 실제 결제를 열 때(나중에 할 일) 이 상자를 뺀다
export function TestModeNotice({ className = "" }: { className?: string }) {
  return (
    <div role="note" className={`rounded-md bg-gray-2 px-4 py-3 ${className}`}>
      <p className="text-label font-bold">연습용 결제 · 실제로 돈이 나가지 않아요</p>
      <p className="mt-0.5 break-keep text-caption text-ink-muted">토스페이먼츠 테스트 모드예요. 카드 정보를 넣어도 청구되지 않아요.</p>
    </div>
  );
}
