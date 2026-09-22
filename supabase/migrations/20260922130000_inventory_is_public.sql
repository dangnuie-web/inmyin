-- 인벤토리도 아이템처럼 숨길 수 있다. 비공개 인벤토리는 남이 볼 때 아예 없는 것처럼 보이고,
-- 그 안의 아이템은 공개로 되어 있어도 보이지 않는다. 안에 담긴 인벤토리도 마찬가지 (겉이 숨으면 속도 숨는다)
alter table public.inventories
  add column is_public boolean not null default true;

grant insert (is_public) on public.inventories to authenticated;
grant update (is_public) on public.inventories to authenticated;

-- 이 인벤토리가 남에게 보이는가 — 자기와 그 위의 인벤토리들(최대 5겹)이 모두 공개이고 지워지지 않았을 때.
-- security definer: 정책 안에서 같은 표를 다시 읽으면 정책이 또 돌아 무한 반복이 되므로, 정책을 건너뛰고 읽는다
create or replace function public.inventory_visible(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive chain as (
    select id, parent_inventory_id, is_public, deleted_at, 1 as depth
    from public.inventories
    where id = target_id
    union all
    select i.id, i.parent_inventory_id, i.is_public, i.deleted_at, c.depth + 1
    from public.inventories i
    join chain c on i.id = c.parent_inventory_id
    where c.depth < 6
  )
  select coalesce(bool_and(is_public and deleted_at is null), false) from chain;
$$;

revoke all on function public.inventory_visible(uuid) from public;
grant execute on function public.inventory_visible(uuid) to anon, authenticated;

-- 남이 읽을 때: 보이는 인벤토리만. 내 것은 비공개든 지운 것이든 다 읽는다 (되돌리기 때문)
drop policy inventories_select on public.inventories;
create policy inventories_select on public.inventories
  for select to anon, authenticated
  using (user_id = (select auth.uid()) or public.inventory_visible(id));

-- 남이 읽을 때: 공개 아이템이라도 그 인벤토리가 숨어 있으면 안 보인다
drop policy items_select on public.items;
create policy items_select on public.items
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (is_public and deleted_at is null and public.inventory_visible(inventory_id))
  );
