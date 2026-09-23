import type { Metadata } from "next";
import { PostGrid } from "@/components/inmyin/PostGrid";
import { MyProfileActions, MyProfileCorner } from "@/components/profile/MyProfileActions";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { requireProfile } from "@/lib/auth/profile";
import { getUserPosts } from "@/lib/inmyin/queries";
import { getMyProfileStats } from "@/lib/profile/queries";

export const metadata: Metadata = { title: "INMYIN · INMYIN" };

// 내 INMYIN 목록. 폰은 헤더 아래 카드 격자, 웹은 프로필 틀의 INMYIN 탭 안에
export default async function MyPostsPage() {
  const profile = await requireProfile();
  const [posts, stats] = await Promise.all([getUserPosts(profile.id), getMyProfileStats(profile.id)]);

  return (
    <ProfileShell
      person={{ ...profile, avatarUrl: profile.avatar_url, followerCount: stats.followerCount, followingCount: stats.followingCount }}
      mine
      tab="inmyin"
      corner={<MyProfileCorner />}
      actions={<MyProfileActions handle={profile.handle} nickname={profile.nickname} />}
    >
      <div className="lg:hidden">
        <HeaderMini icon="back" href="/my" title="INMYIN" />
      </div>
      <main className="flex flex-1 flex-col lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pt-6 lg:pb-4">
        <PostGrid posts={posts} emptyText="아직 INMYIN 이 없어요. 만들기를 눌러 첫 INMYIN 을 올려 보세요." note={`${posts.length}개`} />
      </main>
    </ProfileShell>
  );
}
