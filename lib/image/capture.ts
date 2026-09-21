import type { PendingPhoto } from "./pending-photo";

// 촬영 화면(M-06)에서 셔터를 누른 순간의 카메라 영상을 사진 두 장으로 만든다.
// raw 는 찍힌 전체, photo 는 그중 프레임 안쪽만 잘라낸 것이다.

type Area = { x: number; y: number; width: number; height: number };

function toFile(canvas: HTMLCanvasElement, name: string) {
  return new Promise<File>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(new File([blob], name, { type: blob.type })) : reject(new Error("사진을 만들지 못했습니다."))),
      // 올릴 때 한 번 더 줄이면서 다시 압축하므로 (resize.ts) 여기서는 화질을 높게 둔다
      "image/jpeg",
      0.95,
    ),
  );
}

function draw(video: HTMLVideoElement, area: Area) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  canvas.getContext("2d")!.drawImage(video, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// 화면 위의 프레임이 실제 영상에서는 어디인지 구한다.
// 영상은 화면을 가득 채우도록(object-cover) 키워져 있고, 넘치는 만큼 위아래나 양옆이 똑같이 잘려 있다
function frameAreaInVideo(video: HTMLVideoElement, frame: HTMLElement): Area {
  const screen = video.getBoundingClientRect();
  const box = frame.getBoundingClientRect();
  const scale = Math.max(screen.width / video.videoWidth, screen.height / video.videoHeight);
  const hiddenX = (video.videoWidth * scale - screen.width) / 2;
  const hiddenY = (video.videoHeight * scale - screen.height) / 2;

  const x = Math.max(0, (box.left - screen.left + hiddenX) / scale);
  const y = Math.max(0, (box.top - screen.top + hiddenY) / scale);
  return {
    x,
    y,
    width: Math.min(video.videoWidth - x, box.width / scale),
    height: Math.min(video.videoHeight - y, box.height / scale),
  };
}

export async function capturePhoto(video: HTMLVideoElement, frame: HTMLElement): Promise<PendingPhoto> {
  const whole = { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };
  const [photo, raw] = await Promise.all([
    toFile(draw(video, frameAreaInVideo(video, frame)), "photo.jpg"),
    toFile(draw(video, whole), "raw.jpg"),
  ]);
  return { photo, raw };
}
