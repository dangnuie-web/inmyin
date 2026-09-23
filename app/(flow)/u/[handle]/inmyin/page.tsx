import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PostGrid } from "@/components/inmyin/PostGrid";
import { OtherProfileActions, OtherProfileCorner } from "@/components/profile/OtherProfileActions";
import { ProfileShell } from "@/components/profile/ProfileShell";
import { BackHeader } from "@/components/ui/BackHeader";
import { requireProfile } from "@/lib/auth/profile";
import { HANDLE_PATTERN } from "@/lib/auth/rules";
import { hasBlocked } from "@/lib/block/queries";
import { isFollowing } from "@/lib/follow/queries";
import { getUserPosts } from "@/lib/inmyin/queries";
import { getPublicProfile } from "@/lib/profile/public-queries";

export const metadata: Metadata = { title: "INMYIN · INMYIN" };

// 타유저의 INMYIN 목록. 내 것과 같은 화면. 웹은 프로필 틀의 INMYIN 탭 안에. 차단 사이면 DB 규칙 때문에 비어 보인다
export default async function OtherPostsPage(props: PageProps<"/u/[handle]/inmyin">) {
  const profile = await requireProfile();
  const { handle } = await props.params;
  if (!HANDLE_PATTERN.test(handle)) notFound();
  if (handle === profile.handle) redirect("/my/inmyin");

  const person = await getPublicProfile(handle);
  if (!person) notFound();
  const [posts, following, blocked] = await Promise.all([getUserPosts(person.id), isFollowing(profile.id, person.id), hasBlocked(profile.id, person.id)]);

  return (
    <ProfileShell
      person={person}
      mine={false}
      tab="inmyin"
      corner={<OtherProfileCorner userId={person.id} blocked={blocked} />}
      actions={<OtherProfileActions userId={person.id} handle={person.handle} nickname={person.nickname} following={following} blocked={blocked} />}
    >
      <div className="lg:hidden">
        <BackHeader title="INMYIN" />
      </div>
      <main className="flex flex-1 flex-col lg:mx-5 lg:mt-4 lg:rounded-xl lg:bg-gray-1 lg:pt-6 lg:pb-4">
        <PostGrid posts={posts} emptyText="아직 INMYIN 이 없어요." note={`${posts.length}개`} />
      </main>
    </ProfileShell>
  );
}
