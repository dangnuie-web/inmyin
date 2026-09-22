"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { blockUser, unblockUser } from "@/app/(flow)/u/actions";
import { Button } from "@/components/ui/Button";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";

// 타유저 프로필(H-06) 헤더 오른쪽의 ⋮ 메뉴 — 차단하기 / 차단 해제.
// 차단은 되돌릴 수 있지만 팔로우가 끊기므로, 아래에서 올라오는 판으로 한 번 더 물어본 뒤에 건다 (메뉴는 항목을 누르면 닫힌다)
export function ProfileMenu({ userId, blocked: initialBlocked }: { userId: string; blocked: boolean }) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  function run(next: boolean) {
    close();
    startTransition(async () => {
      const result = next ? await blockUser(userId) : await unblockUser(userId);
      if (result.error) return setNotice(result.error);
      setBlocked(next);
      setNotice(next ? "차단했어요. 서로의 아이템이 보이지 않아요." : "차단을 해제했어요.");
      router.refresh();
    });
  }

  const items = blocked ? [{ label: "차단 해제", onSelect: () => run(false) }] : [{ label: "차단하기", onSelect: () => setConfirming(true) }];

  return (
    <div className="relative flex">
      <button type="button" onClick={() => setOpen(true)} aria-label="더 보기" aria-expanded={open} className="active:opacity-60">
        <Icon name="more" />
      </button>
      {open && <DarkMenu className="right-0 top-full" onClose={() => setOpen(false)} items={items} />}

      {confirming && (
        <>
          <button type="button" aria-label="닫기" onClick={close} className="fixed inset-0 z-30 cursor-default bg-ink/40" />
          <div role="dialog" aria-label="차단 확인" className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md flex-col gap-4 rounded-t-xl bg-white px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="text-title font-bold">정말 차단할까요?</p>
            <p className="break-keep text-label text-ink-muted">서로의 아이템과 인벤토리가 보이지 않게 되고, 팔로우도 끊겨요. 설정 › 차단한 사용자에서 되돌릴 수 있어요.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={close}>
                취소
              </Button>
              <Button onClick={() => run(true)}>차단</Button>
            </div>
          </div>
        </>
      )}

      {pending && <div aria-hidden className="fixed inset-0 z-40 bg-white/60" />}
      <Toast message={notice} onDone={hideNotice} />
    </div>
  );
}
