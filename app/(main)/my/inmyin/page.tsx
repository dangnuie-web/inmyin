import type { Metadata } from "next";
import { PostGrid } from "@/components/inmyin/PostGrid";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { myShellProps } from "@/components/profile/ProfileShells";
import { requireProfile } from "@/lib/auth/profile";
import { getUserPosts } from "@/lib/inmyin/queries";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "INMYIN · INMYIN" };

// 내 프로필 › INMYIN 탭 (내 게시물 카드 격자). 폰도 웹도 프로필 줄 + 세 탭 아래에. 웹은 회색 판 안
export default async function MyPostsPage() {
  const profile = await requireProfile();
  const [posts, stats] = await Promise.all([getUserPosts(profile.id), getMyProfileStats(profile.id)]);

  return (
    <ProfileShell {...myShellProps(profile, stats)} tab="inmyin">
      <div className="flex flex-1 flex-col pt-1 lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pt-2 lg:pb-4">
        <PostGrid posts={posts} empty={{ text: "아직 INMYIN이 없어요.", action: { label: "INMYIN 만들기", href: "/my/inmyin/new" } }} note={`${posts.length}개`} addHref="/my/inmyin/new" />
      </div>
    </ProfileShell>
  );
}
