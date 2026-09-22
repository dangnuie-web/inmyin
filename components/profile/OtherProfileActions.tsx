import { ProfileMenu } from "@/components/block/ProfileMenu";
import { FollowButton } from "@/components/follow/FollowButton";
import { PROFILE_ACTION_CLASS } from "@/components/profile/ProfileParts";
import { SoonButton } from "@/components/profile/SoonButton";

// 타유저 프로필 줄의 버튼들 — 팔로우(차단했으면 "차단함") · 프로필 공유. 폰의 H-06 몸통과 웹의 프로필 틀이 같이 쓴다
export function OtherProfileActions({ userId, following, blocked }: { userId: string; following: boolean; blocked: boolean }) {
  return (
    <>
      {/* FollowButton 은 자기 크기를 가져서, 옆 버튼과 같은 크기가 되게 감싼다. 차단한 사람은 팔로우할 수 없다 */}
      {blocked ? (
        <span className="flex h-9.5 flex-1 items-center justify-center rounded-sm border border-disabled text-label font-bold text-disabled">차단함</span>
      ) : (
        <span className="flex flex-1 [&>button]:h-full [&>button]:w-full [&>button]:rounded-[inherit]">
          <FollowButton userId={userId} following={following} />
        </span>
      )}
      <SoonButton notice="프로필 공유는 곧 만들어요." className={PROFILE_ACTION_CLASS}>
        프로필 공유
      </SoonButton>
    </>
  );
}

export function OtherProfileCorner({ userId, blocked }: { userId: string; blocked: boolean }) {
  return <ProfileMenu userId={userId} blocked={blocked} />;
}
