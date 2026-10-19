"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties } from "react";
import { LANDING_BAG, LANDING_COLUMNS, LANDING_ITEMS, LANDING_MOTION as M } from "@/lib/landing/scene";

// 랜딩의 가방 연출 — 가방에서 아이템이 하나씩 통통 튀어나와 위쪽 칸에 꽂힌다. 그림과 움직임 값은 lib/landing/scene.ts.
// 새 라이브러리 없이 브라우저의 Web Animations API(element.animate)로 움직인다. transform · opacity 만 바꿔서 폰에서도 가볍다.
// 아이템은 처음부터 "칸에 꽂힌 자리"에 그려 두고, 움직일 때만 가방 쪽에서 출발하게 한다 —
// 그래서 "동작 줄이기" 설정이거나 스크립트가 늦게 떠도 멈춘 그림(칸에 꽂힌 모습)이 그대로 보인다
export function BagScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const bag = bagRef.current;
    if (!root || !bag) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animations: Animation[] = [];
    let timers: number[] = [];

    function stop() {
      timers.forEach((timer) => window.clearTimeout(timer));
      animations.forEach((animation) => animation.cancel());
      timers = [];
      animations = [];
    }

    function still() {
      stop();
      root!.dataset.scene = "still";
    }

    function play() {
      stop();
      const bagBox = bag!.getBoundingClientRect();
      // 아이템이 나오는 곳 — 가방 입구(높이는 scene.ts 의 mouthY)의 가운데
      const mouth = { x: bagBox.left + bagBox.width / 2, y: bagBox.top + bagBox.height * LANDING_BAG.mouthY };

      itemRefs.current.forEach((item, index) => {
        const inner = innerRefs.current[index];
        if (!item || !inner) return;
        const box = item.getBoundingClientRect();
        // 칸 자리(0, 0)를 기준으로 가방 입구까지의 거리
        const dx = mouth.x - (box.left + box.width / 2);
        const dy = mouth.y - (box.top + box.height / 2);
        const launch = M.startDelay + index * M.stagger;

        // 날아가는 길 — 가방 입구에서 칸까지 포물선(2차 베지에). 가운데 조절점을 칸보다 높이 두어 솟았다가 내려앉는다
        const control = { x: dx / 2, y: Math.min(dy, 0) - M.arcHeight * 2 };
        const steps = 14;
        const frames: Keyframe[] = [];
        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          const x = (1 - t) ** 2 * dx + 2 * t * (1 - t) * control.x;
          const y = (1 - t) ** 2 * dy + 2 * t * (1 - t) * control.y;
          const grow = Math.min(1, t / 0.45);
          const scale = M.startScale + (1 - M.startScale) * grow;
          frames.push({ offset: t, transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: Math.min(1, t / 0.12) });
        }
        animations.push(item.animate(frames, { duration: M.flight, delay: launch, easing: "linear", fill: "both" }));

        // 칸에 닿으면 바닥을 기준으로 납작해졌다가 튕겨 제 모양으로
        animations.push(
          inner.animate(
            [
              { transform: "scale(1, 1)" },
              { transform: `scale(${1 + M.squash}, ${1 - M.squash})`, offset: 0.3 },
              { transform: `scale(${1 - M.squash / 3}, ${1 + M.squash / 3})`, offset: 0.65 },
              { transform: "scale(1, 1)" },
            ],
            { duration: M.bounce, delay: launch + M.flight, easing: "ease-out" },
          ),
        );

        // 아이템이 나갈 때 가방이 한 번 들썩인다
        animations.push(
          bag!.animate(
            [
              { transform: "translateY(0) scale(1)" },
              { transform: `translateY(-4px) scale(${1 + M.bagHop}, ${1 - M.bagHop / 2})`, offset: 0.4 },
              { transform: "translateY(0) scale(1)" },
            ],
            { duration: M.bagHopTime, delay: launch, easing: "ease-out" },
          ),
        );
      });
      // 애니메이션이 첫 장면(가방 안, 투명)을 잡은 뒤에 숨김을 푼다 — 사이에 화면이 한 번도 그려지지 않는다
      root!.dataset.scene = "playing";

      if (!M.repeat) return;
      const landed = M.startDelay + (LANDING_ITEMS.length - 1) * M.stagger + M.flight + M.bounce;
      timers.push(
        window.setTimeout(() => {
          itemRefs.current.forEach((item) => {
            if (item) animations.push(item.animate([{ opacity: 1 }, { opacity: 0 }], { duration: M.fadeOut, fill: "forwards" }));
          });
          // 다시 시작할 때도 startDelay 만큼 쉬었다가 나온다
          timers.push(window.setTimeout(play, M.fadeOut + M.restGap));
        }, landed + M.hold),
      );
    }

    function update() {
      if (reduce.matches) still();
      else play();
    }

    update();
    // 보는 도중에 "동작 줄이기"를 켜고 끌 수도 있다
    reduce.addEventListener("change", update);
    return () => {
      reduce.removeEventListener("change", update);
      stop();
    };
  }, []);

  const count = LANDING_ITEMS.length;
  const columns = {
    "--cols": Math.max(1, Math.min(count, LANDING_COLUMNS.phone)),
    "--cols-lg": Math.max(1, Math.min(count, LANDING_COLUMNS.web)),
  } as CSSProperties;

  return (
    // data-scene: pending(스크립트 전) → playing · still. 움직임을 허용한 사람에게만, 스크립트 전에는 아이템을 숨겨 둔다 (칸에 꽂힌 모습이 번쩍 보였다가 사라지지 않게)
    <div ref={rootRef} data-scene="pending" className="group flex w-full flex-col items-center" style={{ paddingTop: M.arcHeight }}>
      <ul
        aria-label="가방에서 나온 아이템"
        style={columns}
        className="grid w-full max-w-[calc(var(--cols)*6rem)] grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-2.5 lg:max-w-[calc(var(--cols-lg)*8.5rem)] lg:grid-cols-[repeat(var(--cols-lg),minmax(0,1fr))] lg:gap-3.5"
      >
        {LANDING_ITEMS.map((item, index) => (
          <li key={`${index}-${item.src}`} className="relative aspect-square rounded-sm bg-gray-2">
            <div
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              className="absolute inset-[10%] will-change-transform motion-safe:group-data-[scene=pending]:opacity-0"
            >
              <div
                ref={(element) => {
                  innerRefs.current[index] = element;
                }}
                className="relative size-full origin-bottom"
              >
                <Image src={item.src} alt={item.alt} fill sizes="(min-width: 1024px) 136px, 96px" unoptimized draggable={false} className="object-contain" />
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* 가방은 칸들 앞(위 레이어)에 둬서 아이템이 가방 "안"에서 나오는 것처럼 보인다 */}
      <div
        ref={bagRef}
        style={{ aspectRatio: `${LANDING_BAG.width} / ${LANDING_BAG.height}` }}
        className="relative z-10 mt-12 w-36 origin-bottom lg:mt-16 lg:w-52"
      >
        <Image src={LANDING_BAG.src} alt={LANDING_BAG.alt} fill sizes="(min-width: 1024px) 208px, 144px" unoptimized priority draggable={false} className="object-contain" />
      </div>
    </div>
  );
}
