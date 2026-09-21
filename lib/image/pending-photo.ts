// 고르거나 찍은 사진을 정보 입력 화면까지 들고 가는 임시 보관함.
// 파일은 주소(URL)에 실을 수 없어서 브라우저 메모리에 잠깐 둔다.
// 새로고침하면 사라지는데, 그때는 + 부터 다시 하거나 정보 입력 화면에서 사진을 다시 고른다.

export type PendingPhoto = {
  // 칸에 보일 사진. 촬영 화면(M-06)에서 찍었으면 프레임 안쪽만 잘라낸 것이다
  photo: File;
  // 원본 보관용 (CLAUDE.md 규칙 7). 찍었으면 프레임 밖까지 담긴 전체 사진이다
  raw: File;
};

let pendingPhoto: PendingPhoto | null = null;

export function setPendingPhoto(photo: PendingPhoto | null) {
  pendingPhoto = photo;
}

export function getPendingPhoto() {
  return pendingPhoto;
}

// 갤러리에서 고른 사진은 프레임이 없어서, 칸에 보일 사진과 원본이 같은 파일이다
export function pickedPhoto(file: File): PendingPhoto {
  return { photo: file, raw: file };
}
