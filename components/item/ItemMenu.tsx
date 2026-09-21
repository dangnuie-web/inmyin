"use client";

import { useCallback, useState } from "react";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";

// 아이템 상세(M-14) 헤더 오른쪽의 ⋮ 메뉴. 밀어서 수정 · 삭제와 같은 일을 한다 —
// 밀기를 모르는 사람이나 마우스를 쓰는 데스크톱에서도 수정 · 삭제를 찾을 수 있어야 한다
export function ItemMenu() {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  return (
    <div className="relative flex">
      <button type="button" onClick={() => setOpen(true)} aria-label="더 보기" aria-expanded={open} className="active:opacity-60">
        <Icon name="more" />
      </button>
      {open && (
        <DarkMenu
          className="right-0 top-full"
          onClose={() => setOpen(false)}
          items={[
            { label: "삭제하기", onSelect: () => setNotice("삭제는 곧 만들어요.") },
            { label: "수정하기", onSelect: () => setNotice("수정은 곧 만들어요.") },
          ]}
        />
      )}
      <Toast message={notice} onDone={hideNotice} />
    </div>
  );
}
