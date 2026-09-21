-- 아이템 삭제의 "되돌리기"를 위한 변경.
-- 지웠다가 되살린 아이템은 맨 뒤가 아니라 **원래 있던 순서**로 돌아간다 — 어디에 뒀는지가 바뀌면 안 된다.
-- 번호는 순서일 뿐이고 지워도 남은 것들의 번호는 그대로라서, 옛 번호를 다시 쓰면 원래 이웃들 사이로 들어간다.
-- 그사이 그 번호를 다른 것이 차지했으면 (마지막 아이템을 지운 뒤 새 아이템을 넣은 경우) 맨 뒤로 간다.
-- 꽉 찼는지는 되살릴 때도 똑같이 검사한다.

create or replace function public.check_item_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inventory public.inventories%rowtype;
  v_entering  boolean;
  v_restoring boolean := false;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  -- 같은 유저의 칸 변경은 한 번에 하나씩만 처리한다
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select * into v_inventory from public.inventories where id = new.inventory_id;

  if v_inventory.id is null or v_inventory.deleted_at is not null then
    raise exception '인벤토리를 찾을 수 없습니다' using errcode = 'P0001';
  end if;

  if v_inventory.user_id <> new.user_id then
    raise exception '다른 사람의 인벤토리에는 넣을 수 없습니다' using errcode = 'P0001';
  end if;

  -- 이 인벤토리에 새로 들어오는 것인가:
  -- 새 아이템, 다른 인벤토리에서 옮겨온 것(짐싸기), 지웠다가 되살린 것
  if tg_op = 'INSERT' then
    v_entering := true;
  else
    v_entering := new.inventory_id <> old.inventory_id or old.deleted_at is not null;
    -- 같은 인벤토리에서 지웠다가 되살리는 것
    v_restoring := old.deleted_at is not null and new.inventory_id = old.inventory_id;
  end if;

  if v_entering then
    if public.used_slot_count(new.inventory_id) >= v_inventory.slot_count then
      raise exception '인벤토리가 꽉 찼습니다' using errcode = 'P0001';
    end if;

    if v_restoring
      and not exists (
        select 1 from public.items
        where inventory_id = new.inventory_id and slot_index = old.slot_index
          and deleted_at is null and id <> new.id
      )
      and not exists (
        select 1 from public.inventories
        where parent_inventory_id = new.inventory_id and parent_slot_index = old.slot_index
          and deleted_at is null
      )
    then
      -- 원래 순서로 돌아간다
      new.slot_index := old.slot_index;
    else
      -- 새로 들어오는 것은 항상 맨 뒤. 기존 것을 밀어내지 않는다
      new.slot_index := public.next_slot_index(new.inventory_id);
    end if;
  elsif exists (
    -- 아이템과 중첩 인벤토리가 같은 번호를 쓰면 안 된다
    select 1 from public.inventories
    where parent_inventory_id = new.inventory_id
      and parent_slot_index = new.slot_index
      and deleted_at is null
  ) then
    raise exception '이미 인벤토리가 들어 있는 칸입니다' using errcode = 'P0001';
  end if;

  return new;
end;
$$;
