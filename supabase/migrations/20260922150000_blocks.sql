-- 차단. 차단하면 서로의 아이템 · 인벤토리가 서로에게 안 보인다 (양쪽 다), 서로의 팔로우는 끊긴다.
-- 차단 행은 본인만 보므로(blocks_select_own) "그 사람이 나를 차단했는지"는 정책 안에서 그냥 읽을 수 없다 —
-- security definer 함수로 정책을 건너뛰고 양쪽을 본다

-- 나와 이 사람 사이에 차단이 있는가 (어느 쪽이 걸었든)
create or replace function public.blocked_between(other_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = other_id)
       or (b.blocker_id = other_id and b.blocked_id = (select auth.uid()))
  );
$$;

revoke all on function public.blocked_between(uuid) from public;
grant execute on function public.blocked_between(uuid) to anon, authenticated;

-- 남이 읽을 때: 차단 사이면 안 보인다. 내 것은 그대로
drop policy items_select on public.items;
create policy items_select on public.items
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (is_public and deleted_at is null and public.inventory_visible(inventory_id) and not public.blocked_between(user_id))
  );

drop policy inventories_select on public.inventories;
create policy inventories_select on public.inventories
  for select to anon, authenticated
  using (user_id = (select auth.uid()) or (public.inventory_visible(id) and not public.blocked_between(user_id)));

-- 차단 걸기. 차단 행을 넣고 서로의 팔로우를 끊는다 — 남이 나를 팔로우한 행은 내가 못 지우므로(follows_delete_own) 정책을 건너뛴다
create or replace function public.block_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or target_id = me then
    raise exception 'invalid block';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (me, target_id) on conflict do nothing;
  delete from public.follows
    where (follower_id = me and following_id = target_id) or (follower_id = target_id and following_id = me);
end;
$$;

revoke all on function public.block_user(uuid) from public;
grant execute on function public.block_user(uuid) to authenticated;
