// 저장소에 올린 사진을 DB 에 적을 때 쓰는 규칙. 서버 액션이 브라우저가 보낸 값을 믿지 않고 여기서 거른다.
// (아이템 · 인벤토리 수정의 사진 바꾸기. 등록 액션은 같은 규칙을 각자 들고 있다)

// png 는 배경을 지운 썸네일 (webp 로 못 만드는 사파리에서)
export const IMAGE_EXTENSIONS = ["webp", "jpg", "png"];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// 브라우저가 새 사진을 올린 뒤 보내는 것. 파일 이름은 새 무작위 id — 아이템 · 인벤토리 id 를 다시 쓰면
// 같은 주소에 덮어써서 브라우저 · CDN 이 옛 사진을 계속 보여준다 (프로필 사진과 같은 이유)
export type NewPhotoInput = {
  photoId: string;
  imageExtension: string;
  // 원본의 확장자. 썸네일과 다를 수 있다
  rawImageExtension: string;
};

// 올린 사진의 저장소 경로 둘(썸네일 · 원본). 값이 이상하면 null. 경로는 항상 내 폴더 안이다
export function newPhotoPaths(userId: string, input: NewPhotoInput) {
  if (
    !input ||
    typeof input.photoId !== "string" ||
    !UUID_PATTERN.test(input.photoId) ||
    !IMAGE_EXTENSIONS.includes(input.imageExtension) ||
    !IMAGE_EXTENSIONS.includes(input.rawImageExtension)
  ) {
    return null;
  }
  return {
    path: `${userId}/${input.photoId}.${input.imageExtension}`,
    rawPath: `${userId}/${input.photoId}.${input.rawImageExtension}`,
  };
}
