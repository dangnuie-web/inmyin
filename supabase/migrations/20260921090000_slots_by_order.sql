-- 아이템 등록 ① 을 위한 변경.
-- 1) 인벤토리 사진을 필수로 — 만들기가 항상 사진 고르기로 시작한다
-- 2) 칸 번호(slot_index)를 "고정된 자리"가 아니라 "순서"로 다룬다 (docs/data-model.md 규칙 4)
--    · 새로 들어오는 것은 DB가 항상 맨 뒤 번호를 준다 — 기존 것을 밀어내지 않는다
--    · 꽉 찼는지는 번호가 아니라 든 것의 개수로 본다
--    · 중간 것을 지우면 번호 사이가 비지만, 화면은 순서대로 빈틈 없이 줄 세우므로 당겨 붙어 보인다
-- 3) 아이템 사진을 담을 저장소(버킷) 두 개

-- ─────────────────────────────────────────────────────────────
-- 1) 인벤토리 사진 필수
-- ─────────────────────────────────────────────────────────────

alter table public.inventories
  alter column image_url set not null,
  alter column raw_image_url set not null,
  -- 둘 다 필수가 됐으니 "같이 있거나 같이 없거나" 검사는 필요 없다
  drop constraint inventories_image_pair;

-- ─────────────────────────────────────────────────────────────
-- 2) 칸 번호는 순서
-- ─────────────────────────────────────────────────────────────

-- 번호는 DB가 정하므로 앱은 보내지 않아도 된다
alter table public.items alter column slot_index set default 0;

-- 인벤토리에 든 것의 개수. 아이템과, 안에 담긴 인벤토리가 같은 칸을 쓴다
create function public.used_slot_count(p_inventory_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.items
      where inventory_id = p_inventory_id and deleted_at is null)::int
    + (select count(*) from public.inventories
      where parent_inventory_id = p_inventory_id and deleted_at is null)::int;
$$;

-- 맨 뒤 다음 번호
create function public.next_slot_index(p_inventory_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(n), -1) + 1
  from (
    select slot_index as n from public.items
      where inventory_id = p_inventory_id and deleted_at is null
    union all
    select parent_slot_index from public.inventories
      where parent_inventory_id = p_inventory_id and deleted_at is null
  ) as used;
$$;

create or replace function public.check_item_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inventory public.inventories%rowtype;
  v_entering  boolean;
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
  end if;

  if v_entering then
    if public.used_slot_count(new.inventory_id) >= v_inventory.slot_count then
      raise exception '인벤토리가 꽉 찼습니다' using errcode = 'P0001';
    end if;
    -- 새로 들어오는 것은 항상 맨 뒤. 기존 것을 밀어내지 않는다
    new.slot_index := public.next_slot_index(new.inventory_id);
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
  end if;

  if v_entering then
    if public.used_slot_count(new.parent_inventory_id) >= v_parent.slot_count then
      raise exception '인벤토리가 꽉 찼습니다' using errcode = 'P0001';
    end if;
    -- 아이템과 똑같이, 가져온 인벤토리도 항상 맨 뒤에 들어간다
    new.parent_slot_index := public.next_slot_index(new.parent_inventory_id);
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

-- 트리거 안에서만 쓴다. 밖에서 직접 부를 일이 없다
revoke execute on function public.used_slot_count(uuid), public.next_slot_index(uuid)
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 3) 아이템 사진 저장소. 파일 경로는 <유저 id>/<아이템 id>.<webp 또는 jpg>
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- 썸네일. 주소(무작위 id 두 개)를 아는 사람만 열 수 있다.
  -- 비공개 아이템까지 확실히 잠그는 일은 2단계 "공개/비공개 처리"에서 다시 본다
  ('items', 'items', true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  -- 원본: 본인만 읽는다. 나중에 배경을 다시 따낼 때 쓴다
  ('items-raw', 'items-raw', false, 5242880, array['image/webp', 'image/jpeg', 'image/png']);

-- 자기 폴더에만 올리고 고친다. 지우는 권한은 주지 않는다 — 삭제는 deleted_at 기록뿐이다
create policy item_images_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id in ('items', 'items-raw')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy item_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('items', 'items-raw')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy item_images_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id in ('items', 'items-raw')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('items', 'items-raw')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
