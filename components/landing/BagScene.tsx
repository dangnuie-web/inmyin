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
  const bagFrontRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    const bag = bagRef.current;
    const bagFront = bagFrontRef.current;
    if (!root || !bag || !bagFront) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animations: Animation[] = [];
    // 타이머도 멈췄다 이어 갈 수 있게 남은 시간을 들고 있는다
    type Timer = { id: number | null; run: () => void; remaining: number; startedAt: number };
    let timers: Timer[] = [];
    // 연출이 화면 안에 있는지 · 탭이 보이는지. 둘 다일 때만 돈다
    let onScreen = true;
    let pageShown = document.visibilityState !== "hidden";
    let paused = false;
    // 멈춰 있는 동안 배치가 바뀌면 다시 보일 때 처음부터 시작한다
    let restartOnResume = false;

    function later(run: () => void, delay: number) {
      const timer: Timer = { id: null, run, remaining: delay, startedAt: 0 };
      timers.push(timer);
      if (!paused) startTimer(timer);
    }

    function startTimer(timer: Timer) {
      timer.startedAt = performance.now();
      timer.id = window.setTimeout(() => {
        timers = timers.filter((other) => other !== timer);
        timer.run();
      }, timer.remaining);
    }

    function stop() {
      timers.forEach((timer) => {
        if (timer.id !== null) window.clearTimeout(timer.id);
      });
      animations.forEach((animation) => animation.cancel());
      timers = [];
      animations = [];
    }

    // 화면 밖 · 탭 숨김 — 그 자리에서 멈췄다가 보이면 이어서 돈다 (움직임은 그대로, 계산만 쉰다)
    function pause() {
      if (paused) return;
      paused = true;
      const now = performance.now();
      timers.forEach((timer) => {
        if (timer.id === null) return;
        window.clearTimeout(timer.id);
        timer.id = null;
        timer.remaining = Math.max(0, timer.remaining - (now - timer.startedAt));
      });
      animations.forEach((animation) => {
        if (animation.playState !== "finished") animation.pause();
      });
    }

    function resume() {
      if (!paused) return;
      paused = false;
      if (restartOnResume) {
        restartOnResume = false;
        update();
        return;
      }
      animations.forEach((animation) => {
        if (animation.playState === "paused") animation.play();
      });
      timers.forEach(startTimer);
    }

    function syncRunning() {
      if (onScreen && pageShown) resume();
      else pause();
    }

    function still() {
      stop();
      root!.dataset.scene = "still";
    }

    function play() {
      stop();
      const bagBox = bag!.getBoundingClientRect();
      // 아이템이 나오는 곳 — 열린 입구 안(자리는 scene.ts 의 mouthX · mouthY)
      const mouth = { x: bagBox.left + bagBox.width * LANDING_BAG.mouthX, y: bagBox.top + bagBox.height * LANDING_BAG.mouthY };

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

        // 아이템이 나갈 때 가방이 한 번 들썩인다 — 뒤 겹 · 앞 겹을 똑같이
        for (const layer of [bag!, bagFront!]) {
          animations.push(
            layer.animate(
              [
                { transform: "translateY(0) scale(1)" },
                { transform: `translateY(-4px) scale(${1 + M.bagHop}, ${1 - M.bagHop / 2})`, offset: 0.4 },
                { transform: "translateY(0) scale(1)" },
              ],
              { duration: M.bagHopTime, delay: launch, easing: "ease-out" },
            ),
          );
        }
      });
      // 애니메이션이 첫 장면(가방 안, 투명)을 잡은 뒤에 숨김을 푼다 — 사이에 화면이 한 번도 그려지지 않는다
      root!.dataset.scene = "playing";

      if (!M.repeat) return;
      const landed = M.startDelay + (LANDING_ITEMS.length - 1) * M.stagger + M.flight + M.bounce;
      later(() => {
        itemRefs.current.forEach((item) => {
          if (item) animations.push(item.animate([{ opacity: 1 }, { opacity: 0 }], { duration: M.fadeOut, fill: "forwards" }));
        });
        // 다시 시작할 때도 startDelay 만큼 쉬었다가 나온다
        later(play, M.fadeOut + M.restGap);
      }, landed + M.hold);
    }

    function update() {
      if (reduce.matches) {
        still();
        return;
      }
      // 멈춘 동안 새로 시작했으면 첫 장면에서 바로 멈춰 둔다 (보이면 그때부터 돈다)
      const wasPaused = paused;
      paused = false;
      play();
      if (wasPaused) pause();
    }

    update();
    // 보는 도중에 "동작 줄이기"를 켜고 끌 수도 있다
    reduce.addEventListener("change", update);

    // 화면 밖으로 스크롤되면 멈춘다
    const visibility = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      syncRunning();
    });
    visibility.observe(root);

    // 다른 탭 · 앱으로 가면 멈춘다
    function onVisibilityChange() {
      pageShown = document.visibilityState !== "hidden";
      syncRunning();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 폰을 돌리거나 창 크기가 바뀌어 칸 · 가방 자리가 달라지면, 날아가는 길을 새 자리로 다시 재고 처음부터 시작한다.
    // 크기가 바뀌는 동안은 기다렸다가 멈춘 뒤 한 번만(디바운스). 크기가 그대로면(주소창이 접히는 등) 건드리지 않는다
    let lastSize = { width: root.offsetWidth, height: root.offsetHeight };
    let resizeTimer: number | null = null;
    const resize = new ResizeObserver(() => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resizeTimer = null;
        const size = { width: root.offsetWidth, height: root.offsetHeight };
        if (size.width === lastSize.width && size.height === lastSize.height) return;
        lastSize = size;
        if (reduce.matches) return;
        if (paused) restartOnResume = true;
        else update();
      }, 200);
    });
    resize.observe(root);

    return () => {
      reduce.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      visibility.disconnect();
      resize.disconnect();
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
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
        className="relative z-10 grid w-full max-w-[calc(var(--cols)*6rem)] grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-2.5 lg:max-w-[calc(var(--cols-lg)*8.5rem)] lg:grid-cols-[repeat(var(--cols-lg),minmax(0,1fr))] lg:gap-3.5"
      >
        {LANDING_ITEMS.map((item, index) => (
          <li key={`${index}-${item.src}`} className="relative aspect-square rounded-sm bg-gray-2">
            <div
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              // z-10: 날아가는 동안 다른 칸의 회색 박스보다 위로. li 는 쌓임 맥락이 없어 ul 안에서 겨룬다(가방 앞 겹 z-20 보다는 여전히 아래)
              className="absolute inset-[10%] z-10 will-change-transform motion-safe:group-data-[scene=pending]:opacity-0"
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

      {/* 가방은 두 겹 — 통째 그림(뒤 겹)은 칸들 뒤, 앞 지퍼선 아래만 남긴 그림(앞 겹)은 칸들 앞.
          그래서 아이템이 열린 입구 안 안감 위에서 작게 나타나 앞 지퍼선 뒤에서 솟아오른다.
          이 감싸는 div 에는 z-index · transform 을 주지 않는다 (두 겹이 칸들 앞뒤로 갈라져 쌓이도록) */}
      <div style={{ aspectRatio: `${LANDING_BAG.width} / ${LANDING_BAG.height}` }} className="relative mt-12 w-32 lg:mt-16 lg:w-48">
        <div ref={bagRef} className="absolute inset-0 z-0 origin-bottom">
          <Image src={LANDING_BAG.src} alt={LANDING_BAG.alt} fill sizes="(min-width: 1024px) 192px, 128px" unoptimized priority draggable={false} className="object-contain" />
        </div>
        <div ref={bagFrontRef} aria-hidden className="pointer-events-none absolute inset-0 z-20 origin-bottom">
          <Image src={LANDING_BAG.frontSrc} alt="" fill sizes="(min-width: 1024px) 192px, 128px" unoptimized priority draggable={false} className="object-contain" />
        </div>
      </div>
    </div>
  );
}
