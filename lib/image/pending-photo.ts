// 고르거나 찍은 사진을 정보 입력 화면까지 들고 가는 임시 보관함.
// 파일은 주소(URL)에 실을 수 없어서 브라우저 메모리에 잠깐 둔다.
// 새로고침하면 사라지는데, 그때는 + 부터 다시 하거나 정보 입력 화면에서 사진을 다시 고른다.

export type PendingPhoto = {
  // 칸에 보일 사진. 촬영 화면(M-06)에서 찍었으면 프레임 안쪽만 잘라낸 것이다
  photo: File;
  // 원본 보관용 (CLAUDE.md 규칙 7). 찍었으면 프레임 밖까지 담긴 전체 사진이다
  raw: File;
  // 사진편집(M-07)에서 저장하기를 눌러 나온 것인지. 수정 화면의 사진 바꾸기는 이것만 받는다 —
  // 촬영 · 사진편집에서 그냥 닫고 돌아왔을 때 남아 있는 손대지 않은 사진을 새 사진으로 착각하지 않게
  edited?: boolean;
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

// ─── 수정 화면의 사진 바꾸기 (아이템 · 인벤토리) ───
// 수정 화면 → 촬영(M-06) → 사진편집(M-07) → 수정 화면으로 돌아온다. 화면을 옮기면 수정 화면이 새로 그려져서
// 쓰던 이름 · 설명 같은 값이 사라지므로, 떠나기 전에 여기에 맡겨 두고 돌아와서 찾아간다.
// key 는 "item:<id>" · "inventory:<id>" — 다른 것의 수정 화면이 남의 값을 가져가지 않게.
// 새로고침하면 사라진다(그때는 저장된 값으로 다시 연다)

type PhotoChangeDraft = { key: string; values: unknown };

let photoChangeDraft: PhotoChangeDraft | null = null;

// 사진 바꾸러 떠나기 직전에 부른다
export function savePhotoChangeDraft(key: string, values: unknown) {
  photoChangeDraft = { key, values };
}

// 수정 화면이 열릴 때 읽는다. 맡긴 값이 이 화면 것이면 돌려준다. 읽기만 한다 — 비우기는 clearPhotoChange
// (React 가 개발 모드에서 처음 값을 두 번 만들어서, 읽으면서 비우면 두 번째가 빈손이 된다)
export function peekPhotoChangeDraft<T>(key: string): T | null {
  return photoChangeDraft?.key === key ? (photoChangeDraft.values as T) : null;
}

// 수정 화면이 열릴 때 읽는다. 사진편집에서 저장하기로 돌아왔으면 그 사진, 아니면(닫기 · 뒤로) null
export function peekEditedPhoto(): PendingPhoto | null {
  return pendingPhoto?.edited ? pendingPhoto : null;
}

// 수정 화면이 다 읽은 뒤 부른다 — 맡긴 값과 보관함을 비운다. 한 번만 쓴다
export function clearPhotoChange() {
  photoChangeDraft = null;
  pendingPhoto = null;
}
