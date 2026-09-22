"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { Icon } from "@/components/ui/Icon";
import { Toast } from "@/components/ui/Toast";
import { capturePhoto } from "@/lib/image/capture";
import { pickedPhoto, setPendingPhoto, type PendingPhoto } from "@/lib/image/pending-photo";

// 뒤쪽 카메라를 고른다. 없으면(노트북 등) 있는 카메라가 켜진다.
// 원본은 장변 1280px 로 줄여 보관하므로 (resize.ts) 이보다 크게 받을 필요가 없다
const CAMERA: MediaStreamConstraints = {
  video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
  audio: false,
};

// starting — 카메라를 켜는 중 · ready — 찍을 수 있음 · blocked — 권한을 거절했거나 카메라가 없음
type CameraStatus = "starting" | "ready" | "blocked";

type CameraScreenProps = {
  // × 를 누르면 돌아갈 곳
  closeHref: string;
  // 사진이 정해지면 갈 곳 (편집 화면)
  nextHref: string;
};

// M-06 · 촬영 화면. 아이템 등록과 인벤토리 만들기의 "사진 찍기"가 같이 쓴다.
// 썸네일로 쓰일 네모 프레임 밖은 어둡게 가린다. 찍으면 프레임 안쪽이 칸에 보일 사진이 된다.
export function CameraScreen({ closeHref, nextHref }: CameraScreenProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hideNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stream: MediaStream | null = null;
    // 몇 번째로 켠 것인지. 켜지기를 기다리는 사이에 화면을 떠났거나 다시 켰으면, 늦게 도착한 영상은 버린다
    let turn = 0;

    function stop() {
      turn += 1;
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    }

    async function start() {
      stop();
      const mine = turn;
      try {
        // https 가 아닌 주소에서는 mediaDevices 자체가 없어서 여기서 오류가 난다
        const next = await navigator.mediaDevices.getUserMedia(CAMERA);
        if (mine !== turn) return next.getTracks().forEach((track) => track.stop());
        stream = next;
        video!.srcObject = next;
      } catch {
        if (mine === turn) setStatus("blocked");
      }
    }

    // 다른 앱으로 나가 있는 동안에는 카메라를 끈다. 돌아오면 다시 켠다 —
    // 설정에서 카메라 권한을 허용하고 돌아온 경우도 여기서 풀린다
    function onVisibilityChange() {
      if (document.hidden) {
        stop();
        setStatus("starting");
      } else {
        start();
      }
    }

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, []);

  // 사진을 들고 편집(M-07)으로 간다. 거기서 뒤로 오면 다시 찍을 수 있다
  function next(photo: PendingPhoto) {
    setPendingPhoto(photo);
    router.push(nextHref);
  }

  async function onShutter() {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video?.videoWidth || !frame) return;
    setBusy(true);
    try {
      next(await capturePhoto(video, frame));
    } catch {
      setBusy(false);
      setNotice("사진을 찍지 못했습니다. 다시 시도해 주세요.");
    }
  }

  function onGalleryChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) next(pickedPhoto(file));
  }

  return (
    <main className="relative mx-auto h-dvh w-full max-w-md overflow-hidden bg-ink text-white">
      {/* playsInline 이 없으면 아이폰이 영상을 전체 화면 플레이어로 띄운다 */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={() => setStatus("ready")}
        className="absolute inset-0 size-full object-cover"
      />

      {/* 프레임. 바깥으로 아주 넓은 반투명 테두리를 둘러서 프레임 밖을 어둡게 가린다 */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-5">
        {/* 폰을 눕혀도 위아래 버튼을 덮지 않게, 너비와 (화면 높이 − 위아래 버튼 자리) 중 작은 쪽에 맞춘다 */}
        <div
          ref={frameRef}
          className="flex aspect-square w-[min(100%,100dvh-15rem)] items-center justify-center rounded-lg ring-[100vmax] ring-ink/50"
        >
          {status === "blocked" && (
            <p className="break-keep px-8 text-center text-label">
              카메라를 쓸 수 없어요.
              <br />
              설정에서 카메라를 허용하거나, 아래 갤러리 버튼으로 사진을 골라 주세요.
            </p>
          )}
        </div>
      </div>

      <div className="relative">
        <HeaderMini icon="close" href={closeHref} title="촬영모드" tone="dark" />
      </div>

      <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 items-center pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          aria-label="갤러리에서 선택"
          className="ml-13.75 flex size-13.5 items-center justify-center rounded-full bg-gray-3 text-ink active:opacity-80"
        >
          <Icon name="gallery" />
        </button>
        <button
          type="button"
          onClick={onShutter}
          disabled={status !== "ready" || busy}
          aria-label="사진 찍기"
          className="flex size-19 justify-self-center rounded-full border-2 border-white p-1 active:opacity-80 disabled:opacity-40"
        >
          <span className="size-full rounded-full bg-gray-3" />
        </button>
      </div>

      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={onGalleryChange} />
      <Toast message={notice} onDone={hideNotice} />
    </main>
  );
}
