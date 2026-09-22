export type FollowTab = "followers" | "following";

// 팔로워 · 팔로잉 목록(M-12)의 주소. 내 것도 남의 것도 같은 화면 — 아이디로 연다
export function followsPath(handle: string, tab: FollowTab = "followers") {
  return `/u/${handle}/follows${tab === "following" ? "?tab=following" : ""}`;
}

// 타유저 프로필(H-06). 아직 화면은 없고 주소만 정해 둔다
export function profilePath(handle: string) {
  return `/u/${handle}`;
}
