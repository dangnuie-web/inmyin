"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

type DarkMenuProps = {
  items: { label: string; onSelect: () => void }[];
  onClose: () => void;
  // 어디에 띄울지. 부모가 relative 여야 한다. 예: "left-19 top-7"
  className: string;
};

// + 를 눌렀을 때 뜨는 반투명 검은 메뉴 (M-03 · M-04 · 웹 상단 "+ 추가"). 바깥을 누르면 닫힌다.
// 키보드: 열리면 첫 줄에 포커스, ↑↓ 로 이동, Enter · Space 로 고르기, Esc 로 닫고 포커스는 연 버튼으로 (무늬 인벤토리고르기설계 v01 6-3)
export function DarkMenu({ items, onClose, className }: DarkMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  // 메뉴를 연 버튼. 열린 순간 포커스가 있던 곳이다
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // 메뉴 안의 줄은 연 버튼이 아니다 (개발 모드는 이 effect 를 두 번 돌려서, 두 번째에는 이미 첫 줄에 포커스가 있다)
    const active = document.activeElement;
    if (active instanceof HTMLElement && !menuRef.current?.contains(active)) openerRef.current = active;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus({ preventScroll: true });
  }, []);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      openerRef.current?.focus({ preventScroll: true });
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const rows = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const at = rows.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    rows[(at + step + rows.length) % rows.length]?.focus();
  }

  return (
    <>
      <button type="button" aria-label="메뉴 닫기" tabIndex={-1} onClick={onClose} className="fixed inset-0 z-10 cursor-default" />
      <div
        ref={menuRef}
        role="menu"
        onKeyDown={onKeyDown}
        className={`absolute z-20 flex flex-col whitespace-nowrap rounded-md bg-dropdown px-3 py-2 text-link font-semibold text-white ${className}`}
      >
        {items.map(({ label, onSelect }) => (
          <button
            key={label}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onSelect();
            }}
            className="rounded-sm py-1 text-left outline-none focus-visible:underline focus-visible:underline-offset-4 active:opacity-60"
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
