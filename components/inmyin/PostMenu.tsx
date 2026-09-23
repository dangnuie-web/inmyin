"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePost } from "@/app/(flow)/inmyin/[postId]/actions";
import { Button } from "@/components/ui/Button";
import { DarkMenu } from "@/components/ui/DarkMenu";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";

// 내 게시물 상세(H-04) 헤더 오른쪽의 ⋮ — 삭제하기. 아이템과 달리 "지운 자리"가 없어서 되돌리기 칸 대신 한 번 더 묻는다(차단과 같은 판).
// 지우고 나면 내 프로필로
export function PostMenu({ postId }: { postId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  function remove() {
    close();
    startTransition(async () => {
      const result = await deletePost(postId);
      if (result.error) return setNotice(result.error);
      router.replace("/my");
    });
  }

  return (
    <div className="relative flex">
      <button type="button" onClick={() => setOpen(true)} aria-label="더 보기" aria-expanded={open} className="active:opacity-60">
        <Icon name="more" />
      </button>
      {open && <DarkMenu className="right-0 top-full" onClose={() => setOpen(false)} items={[{ label: "삭제하기", onSelect: () => setConfirming(true) }]} />}

      {confirming && (
        <>
          <button type="button" aria-label="닫기" onClick={close} className="fixed inset-0 z-30 cursor-default bg-ink/40" />
          <div role="dialog" aria-label="삭제 확인" className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md flex-col gap-4 rounded-t-xl bg-white px-5 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <p className="text-title font-bold">이 INMYIN 을 지울까요?</p>
            <p className="break-keep text-label text-ink-muted">지운 게시물은 되돌릴 수 없어요. 캔버스에 올렸던 아이템은 그대로 남아요.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={close}>
                취소
              </Button>
              <Button onClick={remove}>삭제</Button>
            </div>
          </div>
        </>
      )}

      {pending && <div aria-hidden className="fixed inset-0 z-40 bg-white/60" />}
      <Toast message={notice} onDone={hideNotice} />
    </div>
  );
}
