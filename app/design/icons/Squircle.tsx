// 아이폰 아이콘 모양(스쿼클). 아이폰은 아이콘의 투명한 부분을 검게 칠하므로 쓰는 쪽에서 bg-ink 를 깐다.
// |x|ⁿ + |y|ⁿ = 1 인 초타원을 n=5 로 그린 것 — 모서리가 원처럼 딱 꺾이지 않고 변에서부터 서서히 굽는다.
// 0~1 좌표라 어떤 크기에도 씌울 수 있다
function squirclePath(pointsPerQuadrant = 24) {
  const n = 5;
  const total = pointsPerQuadrant * 4;
  const points: string[] = [];
  for (let i = 0; i < total; i++) {
    const t = (i / total) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = 0.5 + 0.5 * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = 0.5 + 0.5 * Math.sign(s) * Math.abs(s) ** (2 / n);
    points.push(`${x.toFixed(4)} ${y.toFixed(4)}`);
  }
  return `M${points.join("L")}Z`;
}

const SQUIRCLE = squirclePath();

// 화면에 한 번만 넣는다. 아래의 모든 Squircle 이 이 하나를 같이 쓴다
export function SquircleDefs() {
  return (
    <svg className="absolute size-0" aria-hidden>
      <defs>
        <clipPath id="ios-squircle" clipPathUnits="objectBoundingBox">
          <path d={SQUIRCLE} />
        </clipPath>
      </defs>
    </svg>
  );
}

export function Squircle({ src, size, className = "", children }: { src?: string; size: number; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`shrink-0 overflow-hidden ${className}`} style={{ width: size, height: size, clipPath: "url(#ios-squircle)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저 안의 data URL 도 들어오므로 next/image 를 쓸 수 없다 */}
      {src && <img src={src} alt="" className="size-full" draggable={false} />}
      {children}
    </div>
  );
}
