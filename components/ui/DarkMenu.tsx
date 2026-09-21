type DarkMenuProps = {
  items: { label: string; onSelect: () => void }[];
  onClose: () => void;
  // 어디에 띄울지. 부모가 relative 여야 한다. 예: "left-19 top-7"
  className: string;
};

// + 를 눌렀을 때 뜨는 반투명 검은 메뉴 (M-03 · M-04). 바깥을 누르면 닫힌다.
export function DarkMenu({ items, onClose, className }: DarkMenuProps) {
  return (
    <>
      <button type="button" aria-label="메뉴 닫기" onClick={onClose} className="fixed inset-0 z-10 cursor-default" />
      <div
        role="menu"
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
            className="py-1 text-left active:opacity-60"
          >
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
