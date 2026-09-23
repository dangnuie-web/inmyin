-- 좋아요 → 북마크. "좋아요" 하나가 반응 · 모아 보기 · 순위를 다 맡던 것을 쪼갠다 —
-- 모아 보기(탭 · 플랜 한도)와 순위는 북마크가, 반응은 새로 만드는 하트가 맡는다 (하트는 다음 마이그레이션).
-- 이름만 바꾸므로 지금까지 누른 좋아요는 그대로 북마크로 남는다.

alter table public.likes rename to bookmarks;
alter table public.bookmarks rename constraint likes_user_id_fkey to bookmarks_user_id_fkey;
alter index public.likes_pkey rename to bookmarks_pkey;
alter index public.likes_target_idx rename to bookmarks_target_idx;
alter index public.likes_ranking_idx rename to bookmarks_ranking_idx;

alter policy likes_select_own on public.bookmarks rename to bookmarks_select_own;
alter policy likes_insert_own on public.bookmarks rename to bookmarks_insert_own;
alter policy likes_delete_own on public.bookmarks rename to bookmarks_delete_own;

-- 순위용 캐시. 화면에는 보이지 않는다 (보이는 수는 하트 수)
alter table public.items        rename column like_count to bookmark_count;
alter table public.inmyin_posts rename column like_count to bookmark_count;

-- 캐시를 세는 트리거도 새 이름으로
drop trigger likes_sync_count on public.bookmarks;
drop function public.sync_like_count();

create function public.sync_bookmark_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   public.bookmarks%rowtype;
  v_delta int;
  v_found boolean;
begin
  if tg_op = 'INSERT' then
    v_row := new;
    v_delta := 1;
  else
    v_row := old;
    v_delta := -1;
  end if;

  if v_row.target_type = 'item' then
    update public.items
    set bookmark_count = greatest(bookmark_count + v_delta, 0)
    where id = v_row.target_id
      and (tg_op = 'DELETE' or (deleted_at is null and (is_public or user_id = v_row.user_id)));
  else
    update public.inmyin_posts
    set bookmark_count = greatest(bookmark_count + v_delta, 0)
    where id = v_row.target_id
      and (tg_op = 'DELETE' or deleted_at is null);
  end if;
  v_found := found;

  -- 없는 것, 지워진 것, 비공개인 것은 북마크할 수 없다
  if tg_op = 'INSERT' and not v_found then
    raise exception '북마크할 수 없는 대상입니다' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

create trigger bookmarks_sync_count
  after insert or delete on public.bookmarks
  for each row execute function public.sync_bookmark_count();

-- 트리거 전용이다. 밖에서 직접 부를 일이 없다
revoke execute on function public.sync_bookmark_count() from public, anon, authenticated;
