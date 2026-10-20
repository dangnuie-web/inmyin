"use client";

import { textFont } from "@/lib/inmyin/fonts";
import { shrinkSlot, TEMPLATE_IDS, TEMPLATE_NUMBERS, templateLayout, templateName, type TemplateId } from "@/lib/inmyin/templates";

// 썸네일 폭 (px). 4:5
const THUMB_WIDTH = 84;
const SCALE = THUMB_WIDTH / 1080;

// 썸네일에 쓸 보기 글자 — 실제로는 인벤토리 이름 · 아이템 이름이 들어간다
const SAMPLE = { inventory: "인벤토리 이름", handle: "inmyin" };

// ＋ 판의 "틀" 칩 — 틀마다 회색 자리로 그린 작은 그림 + 이름. 누르면 바로 캔버스에 (무늬 틀 설계서 v01 5절).
// 썸네일은 사진 대신 회색 자리 — 84px 에서는 사진이 뭉개져 틀 뼈대가 오히려 안 보였다
export function TemplatePicker({ current, onPick }: { current: TemplateId | null; onPick: (id: TemplateId) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex gap-3">
        {TEMPLATE_IDS.map((id) => (
          <li key={id}>
            <button type="button" onClick={() => onPick(id)} aria-pressed={id === current} className="flex flex-col items-center gap-1.5 active:opacity-60">
              <span className={`block overflow-hidden rounded-sm ${id === current ? "ring-2 ring-ink" : "ring-1 ring-border"}`}>
                <TemplateThumb id={id} />
              </span>
              <span className={`text-caption ${id === current ? "font-semibold text-ink" : "text-ink-muted"}`}>{templateName(id)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="break-keep text-caption text-ink-muted">올려 둔 아이템이 틀 자리로 옮겨져요. 옮긴 뒤에도 하나씩 움직일 수 있어요.</p>
    </div>
  );
}

function TemplateThumb({ id }: { id: TemplateId }) {
  const count = TEMPLATE_NUMBERS[id].preview;
  const items = Array.from({ length: count }, (_, i) => ({ objectId: String(i), name: "아이템" }));
  const layout = templateLayout(id, count, SAMPLE, items);
  const look = TEMPLATE_NUMBERS.emptySlot;
  return (
    <span aria-hidden className="relative block" style={{ width: THUMB_WIDTH, height: THUMB_WIDTH * 1.25, background: TEMPLATE_NUMBERS[id].background }}>
      <span className="absolute top-0 left-0 block origin-top-left" style={{ width: 1080, height: 1350, transform: `scale(${SCALE})` }}>
        {layout.slots.map((slot, index) => {
          const box = shrinkSlot(slot);
          return (
            <span
              key={index}
              className="absolute block"
              style={{ left: box.x, top: box.y, width: box.width, height: box.height, borderRadius: look.radius, background: look.stroke, opacity: 0.55, transform: `rotate(${slot.rotation}deg)` }}
            />
          );
        })}
        {layout.texts.map((text) => (
          <span
            key={text.key}
            className="absolute block whitespace-nowrap"
            style={{
              left: text.ax,
              top: text.ay,
              fontFamily: textFont(text.font).family,
              fontSize: text.fontSize,
              fontWeight: text.bold ? 700 : 400,
              lineHeight: 1.3,
              color: text.fill,
              transform: `translate(${text.anchor === "left" ? "0" : text.anchor === "right" ? "-100%" : "-50%"}, -50%)`,
            }}
          >
            {text.text}
          </span>
        ))}
      </span>
    </span>
  );
}
