import type { Metadata } from "next";
import { PostGrid } from "@/components/inmyin/PostGrid";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { loadOtherProfile, otherShellProps } from "@/components/profile/ProfileShells";
import { EmptyLine } from "@/components/ui/EmptyBag";
import { getUserPosts } from "@/lib/inmyin/queries";

export const metadata: Metadata = { title: "INMYIN · INMYIN" };

// 타유저 프로필 › INMYIN 탭. 내 것과 같은 화면. 차단한 사람이면 가방 없이 글 한 줄
export default async function OtherPostsPage(props: PageProps<"/u/[handle]/inmyin">) {
  const { handle } = await props.params;
  const loaded = await loadOtherProfile(handle, "/my/inmyin");
  const { person, blocked } = loaded;
  const posts = blocked ? [] : await getUserPosts(person.id);

  return (
    <ProfileShell {...otherShellProps(loaded)} tab="inmyin">
      <div className="flex flex-1 flex-col pt-1 lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pt-2 lg:pb-4">
        {blocked ? <EmptyLine>차단한 사용자예요. 차단을 풀면 다시 볼 수 있어요.</EmptyLine> : <PostGrid posts={posts} empty={{ text: "아직 INMYIN이 없어요." }} note={`${posts.length}개`} />}
      </div>
    </ProfileShell>
  );
}
