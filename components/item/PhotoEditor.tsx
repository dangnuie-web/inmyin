"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { PhotoPreview } from "@/components/ui/PhotoPreview";
import { Toast } from "@/components/ui/Toast";
import { removeBackground } from "@/lib/background-removal";
import { getPendingPhoto, setPendingPhoto } from "@/lib/image/pending-photo";

type PhotoEditorProps = {
  // 사진 없이 들어왔을 때(새로고침 등) 돌려보낼 곳
  closeHref: string;
  // 저장하기를 누르면 갈 곳 (정보 입력 화면)
  nextHref: string;
};

// M-07 · 사진 편집. 아이템 등록과 인벤토리 만들기가 같이 쓴다.
// 배경제거를 누르면 물건만 남고, 다시 누르면 원래 사진으로 돌아온다. 원본은 어느 쪽이든 그대로 보관된다.
export function PhotoEditor({ closeHref, nextHref }: PhotoEditorProps) {
  const router = useRouter();
  const [pending] = useState(getPendingPhoto);
  // 배경을 지운 사진. 한 번 만들어 두면 껐다 켜도 다시 만들지 않는다
  const [cutout, setCutout] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  // 사진은 앞 단계에서 들고 온다. 새로고침으로 잃었으면 + 부터 다시 한다
  useEffect(() => {
    if (!pending) router.replace(closeHref);
  }, [pending, router, closeHref]);

  if (!pending) return null;
  const photo = removed && cutout ? cutout : pending.photo;

  async function onToggleBackground() {
    if (!pending) return;
    if (removed || cutout) return setRemoved(!removed);

    setWorking(true);
    try {
      const blob = await removeBackground(pending.photo);
      setCutout(new File([blob], "cutout.png", { type: blob.type }));
      setRemoved(true);
    } catch {
      setNotice("배경을 지우지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setWorking(false);
    }
  }

  // 정보 입력에서 뒤로 오면 이 화면이 아니라 촬영 화면이 나오도록 주소를 갈아 끼운다 —
  // 정보 입력을 떠나면 들고 있던 사진이 비워져서, 이 화면은 보여줄 것이 없다
  function onSave() {
    if (!pending) return;
    setPendingPhoto({ photo, raw: pending.raw });
    router.replace(nextHref);
  }

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-ink text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <HeaderMini
          icon="back"
          onClick={() => router.back()}
          title="사진편집"
          tone="dark"
          action={
            <button
              type="button"
              onClick={onToggleBackground}
              disabled={working}
              aria-pressed={removed}
              className="flex items-center gap-2.5 text-label font-bold active:opacity-80 disabled:opacity-40"
            >
              배경제거
              <span
                className={`flex size-11.5 items-center justify-center rounded-full ${
                  removed ? "bg-point text-white" : "bg-gray-3 text-ink"
                }`}
              >
                <Icon name="sparkle" />
              </span>
            </button>
          }
        />

        <div className="flex flex-1 items-center px-3 py-6">
          {/* 칸과 같은 회색 바탕 · 같은 자르기(가운데 정사각형)로 보여준다 — 격자에서 어떻게 보일지 그대로다 */}
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-2">
            <PhotoPreview file={photo} className={working ? "animate-pulse" : ""} />
            {working && (
              <p role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-dropdown text-center text-label">
                <span className="font-bold">배경을 지우는 중…</span>
                <span className="text-caption">처음에는 시간이 조금 걸려요.</span>
              </p>
            )}
          </div>
        </div>

        <Button variant="dark" size="pill" onClick={onSave} disabled={working} className="mx-auto mb-[max(2.5rem,env(safe-area-inset-bottom))]">
          저장하기
        </Button>
      </div>
      <Toast message={notice} onDone={hideNotice} />
    </main>
  );
}
