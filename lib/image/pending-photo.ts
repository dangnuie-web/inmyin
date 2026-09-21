// 목록(M-03)에서 고른 사진을 정보 입력 화면까지 들고 가는 임시 보관함.
// 파일은 주소(URL)에 실을 수 없어서 브라우저 메모리에 잠깐 둔다.
// 새로고침하면 사라지는데, 그때는 정보 입력 화면에서 사진을 다시 고르면 된다.
let pendingPhoto: File | null = null;

export function setPendingPhoto(file: File | null) {
  pendingPhoto = file;
}

export function getPendingPhoto() {
  return pendingPhoto;
}
