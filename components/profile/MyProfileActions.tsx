import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { PROFILE_ACTION_CLASS } from "./ProfileParts";
import { ShareProfileButton } from "./ShareProfileButton";

// 내 프로필 줄의 버튼들 — 프로필 관리 · 프로필 공유. 폰의 M-01 몸통과 웹의 프로필 틀(내 화면들)이 같이 쓴다
export function MyProfileActions({ handle, nickname }: { handle: string; nickname: string }) {
  return (
    <>
      <Link href="/my/edit" className={PROFILE_ACTION_CLASS}>
        프로필 관리
      </Link>
      <ShareProfileButton handle={handle} nickname={nickname} className={PROFILE_ACTION_CLASS} />
    </>
  );
}

// 웹 프로필 틀의 오른쪽 위 — 설정(톱니). 폰에서는 헤더의 톱니가 같은 일을 한다
export function MyProfileCorner() {
  return (
    <Link href="/my/settings" aria-label="설정" className="active:opacity-60">
      <Icon name="settings" scale={0.5} />
    </Link>
  );
}
