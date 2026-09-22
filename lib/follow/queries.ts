import { createClient } from "@/lib/supabase/server";

// 목록에 한 줄로 보이는 사람
export type UserCard = { id: string; handle: string; nickname: string; avatarUrl: string | null };

// 내가 이 사람을 팔로우하고 있는지
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("follows")
    .select("following_id", { count: "exact", head: true })
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export type FollowLists = {
  user: UserCard;
  followers: UserCard[];
  following: UserCard[];
};

// 어떤 사람의 팔로워 · 팔로잉 목록 (M-12). 팔로워 · 팔로잉은 누구나 볼 수 있다 (RLS). 없는 아이디면 null
export async function getFollowLists(handle: string): Promise<FollowLists | null> {
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, handle, nickname, avatar_url")
    .eq("handle", handle)
    .is("deleted_at", null)
    .maybeSingle();
  if (userError) throw userError;
  if (!user) return null;

  // 팔로우 표에서 상대 쪽 사람을 같이 읽는다. follows 가 users 를 두 번 가리켜서(follower_id · following_id) 어느 쪽인지 적어 준다
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("created_at, users!follows_follower_id_fkey(id, handle, nickname, avatar_url)").eq("following_id", user.id).order("created_at", { ascending: false }),
    supabase.from("follows").select("created_at, users!follows_following_id_fkey(id, handle, nickname, avatar_url)").eq("follower_id", user.id).order("created_at", { ascending: false }),
  ]);
  const error = followers.error ?? following.error;
  if (error) throw error;

  const toCard = (row: { id: string; handle: string; nickname: string; avatar_url: string | null }): UserCard => ({
    id: row.id,
    handle: row.handle,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
  });
  return {
    user: toCard(user),
    followers: (followers.data ?? []).map((row) => toCard(row.users)),
    following: (following.data ?? []).map((row) => toCard(row.users)),
  };
}

// 내가 팔로우하는 사람들의 id — 목록의 버튼이 "팔로우"인지 "팔로잉"인지 정할 때
export async function getMyFollowingIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  if (error) throw error;
  return new Set(data.map((row) => row.following_id));
}
