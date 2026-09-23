-- 순위 집계 (발견 탭 H-05, INMYIN 목록의 인기순). 북마크 행은 본인만 읽을 수 있어서(bookmarks_select_own)
-- 남의 것까지 세려면 security definer 가 필요하다 — 돌려주는 것은 숫자뿐이라 누가 눌렀는지는 새지 않는다.
-- 문턱(추천 = 누적 북마크 100 미만)은 lib/ranking.ts 의 상수에서 받는다 (CLAUDE.md 규칙 8 — 숫자는 코드에)

-- 발견 탭의 사람들. mode = 'popular' — 최근 24시간에 받은 북마크 순 (전체 유저).
--                   mode = 'recommend' — 누적 북마크가 문턱 미만인 유저 중 최근 1시간에 받은 북마크 순.
-- 게시물이 있는 사람만, 나와 차단 사이인 사람과 나 자신은 빼고. 점수가 같으면 최근에 올린 사람 먼저 — 아직 북마크가 적을 때도 목록이 비지 않게
create or replace function public.discover_users(p_mode text, p_threshold int, p_limit int default 30)
returns table (user_id uuid, score bigint, latest_post_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with posters as (
    select p.user_id, max(p.created_at) as latest_post_at
    from public.inmyin_posts p
    where p.deleted_at is null
    group by p.user_id
  ),
  recent as (
    select p.user_id, count(*) as score
    from public.bookmarks b
    join public.inmyin_posts p on p.id = b.target_id and b.target_type = 'post'
    where p.deleted_at is null
      and b.created_at > now() - (case when p_mode = 'recommend' then interval '1 hour' else interval '24 hours' end)
    group by p.user_id
  ),
  total as (
    select p.user_id, count(*) as total
    from public.bookmarks b
    join public.inmyin_posts p on p.id = b.target_id and b.target_type = 'post'
    where p.deleted_at is null
    group by p.user_id
  )
  select ps.user_id, coalesce(r.score, 0) as score, ps.latest_post_at
  from posters ps
  left join recent r on r.user_id = ps.user_id
  left join total t on t.user_id = ps.user_id
  join public.users u on u.id = ps.user_id and u.deleted_at is null
  where (p_mode <> 'recommend' or coalesce(t.total, 0) < p_threshold)
    and ps.user_id is distinct from auth.uid()
    and not public.blocked_between(ps.user_id)
  order by score desc, ps.latest_post_at desc
  limit p_limit
$$;

-- INMYIN 목록(H-03)의 인기순 — 최근 24시간에 받은 북마크 순, 같으면 최신순. 게시물 id 를 순서대로 돌려준다
create or replace function public.popular_posts(p_limit int default 60)
returns table (post_id uuid, score bigint)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, count(b.target_id) filter (where b.created_at > now() - interval '24 hours') as score
  from public.inmyin_posts p
  left join public.bookmarks b on b.target_type = 'post' and b.target_id = p.id
  where p.deleted_at is null
    and not public.blocked_between(p.user_id)
  group by p.id, p.created_at
  order by score desc, p.created_at desc
  limit p_limit
$$;

revoke all on function public.discover_users(text, int, int), public.popular_posts(int) from public;
grant execute on function public.discover_users(text, int, int), public.popular_posts(int) to anon, authenticated;
