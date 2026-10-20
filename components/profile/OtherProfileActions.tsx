import { ProfileMenu } from "@/components/block/ProfileMenu";
import { FollowButton } from "@/components/follow/FollowButton";
import { PROFILE_ACTION_OUTLINE_CLASS } from "@/components/profile/ProfileParts";
import { ShareProfileButton } from "@/components/profile/ShareProfileButton";

// 타유저 프로필 줄의 버튼들 — 팔로우(차단했으면 "차단함") · 프로필 공유. 폰의 H-06 몸통과 웹의 프로필 틀이 같이 쓴다.
// guest = 로그인 안 한 사람. 팔로우를 누르면 로그인으로 간다
type OtherProfileActionsProps = { userId: string; handle: string; nickname: string; following: boolean; blocked: boolean; guest?: boolean };

export function OtherProfileActions({ userId, handle, nickname, following, blocked, guest = false }: OtherProfileActionsProps) {
  return (
    <>
      {/* FollowButton 은 자기 크기를 가져서, 옆 버튼과 같은 크기가 되게 감싼다. 차단한 사람은 팔로우할 수 없다 */}
      {blocked ? (
        <span className="flex h-9.5 flex-1 items-center justify-center rounded-sm border border-disabled text-label font-bold text-disabled">차단함</span>
      ) : (
        <span className="flex flex-1 [&>button]:h-full [&>button]:w-full [&>button]:rounded-[inherit]">
          <FollowButton userId={userId} following={following} guest={guest} />
        </span>
      )}
      <ShareProfileButton handle={handle} nickname={nickname} className={PROFILE_ACTION_OUTLINE_CLASS} />
    </>
  );
}

// ⋮ 메뉴(차단). 로그인 안 한 사람에게는 없다 — 차단할 "나"가 없다
export function OtherProfileCorner({ userId, blocked, guest = false }: { userId: string; blocked: boolean; guest?: boolean }) {
  if (guest) return null;
  return <ProfileMenu userId={userId} blocked={blocked} />;
}
