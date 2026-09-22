import type { Metadata } from "next";
import { UnblockButton } from "@/components/block/UnblockButton";
import { Avatar } from "@/components/profile/Avatar";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getMyBlockedUsers } from "@/lib/block/queries";

export const metadata: Metadata = { title: "차단한 사용자 · INMYIN" };

// 설정 › 차단한 사용자. 여기서 해제한다. 차단은 타유저 프로필(H-06)의 ⋮ 메뉴에서 건다
export default async function BlockedUsersPage() {
  const profile = await requireProfile();
  const people = await getMyBlockedUsers(profile.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-10">
      <HeaderMini icon="back" href="/my/settings" title="차단한 사용자" />
      {people.length === 0 ? (
        <p className="mt-16 break-keep px-5 text-center text-label text-ink-muted">차단한 사용자가 없어요.</p>
      ) : (
        <>
          <p className="break-keep px-5 pt-4 text-caption text-ink-muted">차단한 사람과는 서로의 아이템 · 인벤토리가 보이지 않고, 팔로우도 끊겨요.</p>
          <ul className="mt-2 flex flex-col">
            {people.map((person) => (
              <li key={person.id} className="flex h-16 items-center gap-3 px-5">
                <Avatar url={person.avatarUrl} size={44} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label font-bold">{person.nickname}</span>
                  <span className="truncate text-caption text-ink-muted">@{person.handle}</span>
                </span>
                <UnblockButton userId={person.id} />
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
