import { notFound, redirect } from "next/navigation";
import { BackHeader } from "@/components/ui/BackHeader";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { getViewer, type requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { hasBlocked } from "@/lib/block/queries";
import { isFollowing } from "@/lib/follow/queries";
import type { ProfileStats } from "@/lib/profile/queries";
import { getPublicProfile } from "@/lib/profile/public-queries";
import { MyProfileActions, MyProfileCorner } from "./MyProfileActions";
import { OtherProfileActions, OtherProfileCorner } from "./OtherProfileActions";

type MyProfile = Awaited<ReturnType<typeof requireProfile>>;

// 내 프로필 틀(ProfileShell)에 넘길 것 — 인벤토리 · 아이템 · INMYIN 세 탭이 같이 쓴다. 폰 헤더는 톱니 · 프로필
export function myShellProps(profile: MyProfile, stats: Pick<ProfileStats, "followerCount" | "followingCount">) {
  return {
    person: {
      handle: profile.handle,
      nickname: profile.nickname,
      avatarUrl: profile.avatar_url,
      followerCount: stats.followerCount,
      followingCount: stats.followingCount,
      premium: profile.plan === "premium",
    },
    mine: true,
    corner: <MyProfileCorner />,
    actions: <MyProfileActions handle={profile.handle} nickname={profile.nickname} />,
    phoneHeader: <HeaderMini icon="settings" href="/my/settings" title="프로필" />,
  };
}

// 남의 프로필 세 탭이 먼저 하는 일 — 아이디 확인, 내 아이디면 내 화면(mine)으로, 사람 읽기, 팔로우 · 차단 여부.
// 로그인 없이도 열린다 (구경) — 그때는 팔로우를 누르면 로그인으로, ⋮(차단) 메뉴는 없다
export async function loadOtherProfile(handle: string, mine: string) {
  const viewer = await getViewer();
  if (!HANDLE_PATTERN.test(handle)) notFound();
  if (handle === viewer?.handle) redirect(mine);

  const person = await getPublicProfile(handle);
  if (!person) notFound();
  const [following, blocked] = await Promise.all([viewer ? isFollowing(viewer.id, person.id) : false, viewer ? hasBlocked(viewer.id, person.id) : false]);
  return { viewer, person, following, blocked };
}

// 남의 프로필 틀에 넘길 것. 폰 헤더는 ‹ 프로필 ⋮(차단하기 / 차단 해제)
export function otherShellProps({ viewer, person, following, blocked }: Awaited<ReturnType<typeof loadOtherProfile>>) {
  const corner = <OtherProfileCorner userId={person.id} blocked={blocked} guest={!viewer} />;
  return {
    person,
    mine: false,
    corner,
    actions: <OtherProfileActions userId={person.id} handle={person.handle} nickname={person.nickname} following={following} blocked={blocked} guest={!viewer} />,
    phoneHeader: <BackHeader title="프로필" action={corner} />,
  };
}
