"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteItem } from "@/app/(flow)/items/[itemId]/actions";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { inventoryPath, itemUpdatePath } from "@/lib/inventory/paths";

// 아이템 상세(M-14) 헤더 오른쪽의 ⋮ 메뉴. 리스트의 밀기 · 그리드의 길게 누르기와 같은 일을 한다 —
// 그 동작을 모르는 사람도 수정 · 삭제를 찾을 수 있어야 한다
export function ItemMenu({ itemId, inventoryId }: { itemId: string; inventoryId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  // 지우고 나면 이 화면은 보여줄 것이 없다. 인벤토리로 돌아가고, "되돌리기"는 거기서 띄운다
  function remove() {
    startTransition(async () => {
      const result = await deleteItem(itemId);
      if (result.error) return setNotice(result.error);
      router.replace(inventoryPath(inventoryId, { deleted: itemId }));
    });
  }

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
            { label: "삭제하기", onSelect: remove },
            { label: "수정하기", onSelect: () => router.push(itemUpdatePath(itemId)) },
          ]}
        />
      )}
      <Toast message={notice} onDone={hideNotice} />
    </div>
  );
}
