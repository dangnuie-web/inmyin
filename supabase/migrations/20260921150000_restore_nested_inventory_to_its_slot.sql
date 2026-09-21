-- 인벤토리 안에 인벤토리 담기를 위한 변경.
-- 다른 인벤토리 안에 담긴 인벤토리를 지웠다가 되살리면, 부모의 맨 뒤가 아니라 **원래 있던 순서**로 돌아간다.
-- 아이템의 되돌리기(20260921130000)와 같은 규칙이다: 옛 번호를 다시 쓰고, 그사이 그 번호를 다른 것이 차지했으면 맨 뒤로.
-- 나머지(순환 · 5겹 · 꽉 찼는지 · 새로 들어오면 맨 뒤)는 그대로다.

create or replace function public.check_inventory_nesting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 한 줄로 이어지는 중첩 한도 (예: 집 › 방 › 가방 › 작은 가방 › 파우치)
  c_max_depth constant int := 5;
  v_parent   public.inventories%rowtype;
  v_entering boolean;
  v_restoring boolean := false;
  v_above    int;
  v_below    int;
  v_cycle    boolean;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  -- 크기를 줄일 때, 이미 든 것이 새 크기보다 많으면 안 된다
  if tg_op = 'UPDATE' and new.slot_count < old.slot_count
    and public.used_slot_count(new.id) > new.slot_count then
    raise exception '줄이려는 크기보다 들어 있는 것이 많습니다' using errcode = 'P0001';
  end if;

  if new.parent_inventory_id is null then
    return new;
  end if;

  select * into v_parent from public.inventories where id = new.parent_inventory_id;

  if v_parent.id is null or v_parent.deleted_at is not null then
    raise exception '담을 인벤토리를 찾을 수 없습니다' using errcode = 'P0001';
  end if;

  if v_parent.user_id <> new.user_id then
    raise exception '다른 사람의 인벤토리에는 담을 수 없습니다' using errcode = 'P0001';
  end if;

  -- 이 부모 안으로 새로 들어오는 것인가
  if tg_op = 'INSERT' then
    v_entering := true;
  else
    v_entering := old.parent_inventory_id is distinct from new.parent_inventory_id
      or old.deleted_at is not null;
    -- 같은 부모 안에서 지웠다가 되살리는 것
    v_restoring := old.deleted_at is not null
      and old.parent_inventory_id is not distinct from new.parent_inventory_id;
  end if;

  if v_entering then
    if public.used_slot_count(new.parent_inventory_id) >= v_parent.slot_count then
      raise exception '인벤토리가 꽉 찼습니다' using errcode = 'P0001';
    end if;
    if v_restoring
      and old.parent_slot_index is not null
      and not exists (
        select 1 from public.items
        where inventory_id = new.parent_inventory_id and slot_index = old.parent_slot_index
          and deleted_at is null
      )
      and not exists (
        select 1 from public.inventories
        where parent_inventory_id = new.parent_inventory_id and parent_slot_index = old.parent_slot_index
          and deleted_at is null and id <> new.id
      )
    then
      -- 원래 순서로 돌아간다
      new.parent_slot_index := old.parent_slot_index;
    else
      -- 아이템과 똑같이, 가져온 인벤토리도 항상 맨 뒤에 들어간다
      new.parent_slot_index := public.next_slot_index(new.parent_inventory_id);
    end if;
  elsif exists (
    select 1 from public.items
    where inventory_id = new.parent_inventory_id
      and slot_index = new.parent_slot_index
      and deleted_at is null
  ) then
    raise exception '이미 아이템이 들어 있는 칸입니다' using errcode = 'P0001';
  end if;

  -- 위로 몇 겹인지 세면서, 그 길에 자기 자신이 있는지(순환) 본다
  with recursive up as (
    select id, parent_inventory_id, 1 as lvl
    from public.inventories
    where id = new.parent_inventory_id
    union all
    select i.id, i.parent_inventory_id, up.lvl + 1
    from public.inventories i
    join up on i.id = up.parent_inventory_id
    where up.lvl <= c_max_depth
  )
  select max(lvl), bool_or(id = new.id) into v_above, v_cycle from up;

  if v_cycle then
    raise exception '자기 안에 든 인벤토리 속으로는 들어갈 수 없습니다' using errcode = 'P0001';
  end if;

  -- 아래로 몇 겹을 달고 있는지
  with recursive down as (
    select id, 1 as lvl
    from public.inventories
    where parent_inventory_id = new.id and deleted_at is null
    union all
    select i.id, down.lvl + 1
    from public.inventories i
    join down on i.parent_inventory_id = down.id
    where i.deleted_at is null and down.lvl <= c_max_depth
  )
  select coalesce(max(lvl), 0) into v_below from down;

  if v_above + 1 + v_below > c_max_depth then
    raise exception '인벤토리는 %겹까지만 겹쳐 담을 수 있습니다', c_max_depth using errcode = 'P0001';
  end if;

  return new;
end;
$$;
