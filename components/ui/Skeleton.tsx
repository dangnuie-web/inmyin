// 화면이 오는 동안 먼저 보여주는 뼈대. 누른 즉시 이것이 뜨고, 서버가 답하면 진짜 화면으로 바뀐다 —
// 홈 화면 앱은 브라우저의 진행 막대가 없어서, 이게 없으면 서버를 기다리는 0.3~1.5초 동안 고장 난 것처럼 멈춰 보인다.
// 어느 화면인지 모르는 채 뜨므로 모양은 대충 — 헤더 한 줄과 회색 덩어리들. 회색은 gray-2, 숨 쉬듯 깜빡인다

function Block({ className }: { className: string }) {
  return <div aria-hidden className={`rounded-md bg-gray-2 ${className}`} />;
}

// 하단 탭이 있는 화면들(Home · Bookmark · My)의 뼈대
export function TabScreenSkeleton() {
  return (
    <div role="status" aria-label="불러오는 중" className="mx-auto flex w-full max-w-md flex-1 animate-pulse flex-col px-5 pt-5">
      <Block className="h-5 w-40" />
      <Block className="mt-6 h-7.5 w-full rounded-full" />
      <div className="mt-8 grid grid-cols-3 gap-3.5">
        {Array.from({ length: 6 }, (_, i) => (
          <Block key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}

// 하단 탭이 없는 화면들(상세 · 목록 · 입력)의 뼈대 — 헤더 자리부터
export function FlowScreenSkeleton() {
  return (
    <div role="status" aria-label="불러오는 중" className="mx-auto flex w-full max-w-md flex-1 animate-pulse flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <Block className="size-6 rounded-full" />
        <Block className="h-5 w-32" />
      </div>
      <div className="flex flex-col gap-4 px-5 pt-2">
        <Block className="aspect-square w-full rounded-lg" />
        <Block className="h-6 w-48" />
        <Block className="h-4 w-full" />
        <Block className="h-4 w-2/3" />
      </div>
    </div>
  );
}
