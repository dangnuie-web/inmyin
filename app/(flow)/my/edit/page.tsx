import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";

export const metadata: Metadata = { title: "프로필 관리 · INMYIN" };

// 프로필 관리. 내 프로필(M-01)의 "프로필 관리" 버튼에서 온다. 하단 탭이 없는 어두운 입력 화면이다
export default async function ProfileEditPage() {
  const profile = await requireProfile();

  return (
    <main className="flex flex-1 flex-col bg-surface-dark">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <HeaderMini icon="close" href="/my" title="프로필 관리" tone="dark" />
        <ProfileForm userId={profile.id} nickname={profile.nickname} handle={profile.handle} avatarUrl={profile.avatar_url} />
      </div>
    </main>
  );
}
