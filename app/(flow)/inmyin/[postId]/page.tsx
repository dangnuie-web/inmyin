import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookmarkButton } from "@/components/bookmark/BookmarkButton";
import { CommentCount } from "@/components/comment/CommentCount";
import { CommentSection } from "@/components/comment/CommentSection";
import { FollowButton } from "@/components/follow/FollowButton";
import { HeartButton } from "@/components/heart/HeartButton";
import { PostImage } from "@/components/inmyin/PostImage";
import { PostMenu } from "@/components/inmyin/PostMenu";
import { Avatar } from "@/components/profile/Avatar";
import { BackHeader } from "@/components/ui/BackHeader";
import { requireProfile } from "@/lib/auth/profile";
import { hasBookmarked } from "@/lib/bookmark/queries";
import { getComments } from "@/lib/comment/queries";
import { isFollowing } from "@/lib/follow/queries";
import { hasHearted } from "@/lib/heart/queries";
import { getPostDetail } from "@/lib/inmyin/queries";
import { formatShortDate } from "@/lib/item/rules";
import { profilePath } from "@/lib/profile/paths";

export const metadata: Metadata = { title: "INMYIN" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// H-04 · Home › INMYIN 상세. 아이템 상세(H-02)와 같은 틀 — 작성자 줄 · 이미지(아이템 라벨 = 탭 영역) · 제목 [하트 · 댓글 · 북마크] · 내용 · 댓글.
// 목록(H-03) · 프로필의 카드에서 온다. 하단 탭이 없는 화면이라 (flow) 묶음에 둔다
export default async function PostDetailPage(props: PageProps<"/inmyin/[postId]">) {
  const profile = await requireProfile();
  const { postId } = await props.params;
  if (!UUID_PATTERN.test(postId)) notFound();

  // 지워진 게시물 · 차단 사이의 게시물은 DB 규칙(RLS)이 돌려주지 않아서 없는 것이 된다
  const post = await getPostDetail(postId);
  if (!post) notFound();
  const isMine = post.author.id === profile.id;
  const me = { id: profile.id, handle: profile.handle, nickname: profile.nickname, avatarUrl: profile.avatar_url };

  const [hearted, bookmarked, following, comments] = await Promise.all([
    hasHearted(profile.id, "post", post.id),
    hasBookmarked(profile.id, "post", post.id),
    isMine ? false : isFollowing(profile.id, post.author.id),
    getComments("post", post.id),
  ]);

  return (
    // 아래 여백은 댓글 입력칸이 맡는다
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      {/* 내 게시물이면 ⋮ → 삭제하기 */}
      <BackHeader icon="close" title="INMYIN" action={isMine ? <PostMenu postId={post.id} /> : undefined} />

      {/* 작성자 줄 (H-02 와 같다). 사진과 이름을 누르면 그 사람의 프로필 */}
      <div className="mt-4 flex items-center gap-5 px-5">
        <Link href={isMine ? "/my" : profilePath(post.author.handle)} className="flex min-w-0 flex-1 items-center gap-5 active:opacity-60">
          <Avatar url={post.author.avatarUrl} size={72} />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-body font-bold">{post.author.nickname}</span>
            <span className="text-body">{formatShortDate(new Date(post.createdAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }))}</span>
          </span>
        </Link>
        {!isMine && <FollowButton userId={post.author.id} following={following} />}
      </div>

      <div className="mt-5 px-5">
        <PostImage imageUrl={post.imageUrl} title={post.title} hotspots={post.hotspots} />
      </div>

      <section className="mt-6 px-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 truncate text-title font-bold">{post.title}</h2>
          {/* [하트 · 하트 수 · 댓글 · 댓글 수 · 북마크] (CLAUDE.md) */}
          <div className="flex shrink-0 items-center gap-4">
            <HeartButton targetType="post" targetId={post.id} hearted={hearted} count={post.heartCount} />
            <CommentCount count={post.commentCount} />
            <BookmarkButton targetType="post" targetId={post.id} bookmarked={bookmarked} />
          </div>
        </div>
        {post.description && <p className="mt-4 whitespace-pre-line break-keep text-label">{post.description}</p>}
      </section>

      <CommentSection targetType="post" targetId={post.id} comments={comments} me={me} ownerId={post.author.id} />
    </main>
  );
}
