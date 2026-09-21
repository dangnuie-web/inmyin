import { createClient } from "@/lib/supabase/server";

export type ProfileItem = { id: string; name: string; imageUrl: string };

export type ProfileStats = {
  followerCount: number;
  followingCount: number;
  // 내 아이템 전체 수. 인벤토리 안에 담긴 인벤토리는 세지 않는다
  itemCount: number;
  postCount: number;
  // 최근에 등록한 아이템. 프로필의 ITEM 줄에 늘어놓는다
  recentItems: ProfileItem[];
};

const RECENT_ITEM_LIMIT = 12;

// 내 프로필(M-01)에 나오는 숫자들과 최근 아이템
export async function getMyProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = await createClient();
  const count = { count: "exact", head: true } as const;
  const [followers, following, posts, items] = await Promise.all([
    supabase.from("follows").select("follower_id", count).eq("following_id", userId),
    supabase.from("follows").select("following_id", count).eq("follower_id", userId),
    supabase.from("inmyin_posts").select("id", count).eq("user_id", userId).is("deleted_at", null),
    supabase
      .from("items")
      .select("id, name, image_url", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(RECENT_ITEM_LIMIT),
  ]);
  const error = followers.error ?? following.error ?? posts.error ?? items.error;
  if (error) throw error;

  return {
    followerCount: followers.count ?? 0,
    followingCount: following.count ?? 0,
    postCount: posts.count ?? 0,
    itemCount: items.count ?? 0,
    recentItems: items.data!.map((item) => ({ id: item.id, name: item.name, imageUrl: item.image_url })),
  };
}
