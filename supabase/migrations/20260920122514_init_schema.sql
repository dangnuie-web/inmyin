-- INMYIN 첫 스키마. 정의는 docs/data-model.md.
-- 문서의 camelCase 이름은 DB에서 snake_case로 쓴다 (User.avatarUrl → users.avatar_url).
-- Inventory.order 는 SQL 예약어라 sort_order 로 쓴다.
--
-- 물리 삭제는 없다. 지울 때는 deleted_at 을 기록한다.
-- 그래서 likes · follows · blocks 말고는 어떤 테이블에도 DELETE 권한을 주지 않는다.

-- ─────────────────────────────────────────────────────────────
-- 테이블
-- ─────────────────────────────────────────────────────────────

create table public.users (
  id          uuid primary key references auth.users (id),
  handle      text not null,
  nickname    text not null,
  avatar_url  text,
  bio         text,
  plan        text not null default 'basic' check (plan in ('basic', 'premium')),
  provider    text check (provider in ('google', 'kakao', 'email')),
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  -- /u/[handle] 주소에 그대로 들어간다
  constraint users_handle_format check (handle ~ '^[a-z0-9_]{3,30}$')
);

create unique index users_handle_key on public.users (handle);

create table public.inventories (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users (id),
  kind                 text not null check (kind in ('closet', 'fridge', 'home', 'supplies', 'custom')),
  name                 text not null,
  -- 값은 lib/plans.ts 에서 온다. DB는 플랜 한도를 모른다
  slot_count           int  not null check (slot_count > 0),
  parent_inventory_id  uuid references public.inventories (id),
  parent_slot_index    int  check (parent_slot_index >= 0),
  sort_order           int  not null default 0,
  created_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  constraint inventories_parent_pair check ((parent_inventory_id is null) = (parent_slot_index is null)),
  constraint inventories_not_own_parent check (parent_inventory_id <> id)
);

create index inventories_user_id_idx on public.inventories (user_id);

-- 한 칸에 하나. 지워진 것은 칸을 비워준다
create unique index inventories_parent_slot_key
  on public.inventories (parent_inventory_id, parent_slot_index)
  where deleted_at is null and parent_inventory_id is not null;

create table public.items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id),
  inventory_id   uuid not null references public.inventories (id),
  slot_index     int  not null check (slot_index >= 0),
  -- lib/categories.ts 의 값 중 하나. custom 인벤토리의 아이템은 null
  category       text,
  image_url      text not null,
  -- 배경제거 전 원본
  raw_image_url  text not null,
  name           text not null,
  description    text,
  quantity       int  not null default 1 check (quantity >= 0),
  is_public      boolean not null default false,
  acquired_at    date,
  expires_at     date,
  -- 캐시. likes 트리거만 바꾼다
  like_count     int  not null default 0,
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create index items_user_id_idx on public.items (user_id);

-- 한 칸에 하나. 지워진 것은 칸을 비워준다
create unique index items_slot_key
  on public.items (inventory_id, slot_index)
  where deleted_at is null;

-- Home › 아이템 피드
create index items_public_feed_idx
  on public.items (created_at desc)
  where is_public and deleted_at is null;

create table public.inmyin_posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id),
  image_url    text not null,
  canvas_json  jsonb not null,
  -- 캐시. likes 트리거만 바꾼다
  like_count   int  not null default 0,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index inmyin_posts_user_id_idx on public.inmyin_posts (user_id);

create index inmyin_posts_feed_idx
  on public.inmyin_posts (created_at desc)
  where deleted_at is null;

-- 게시물 ↔ 아이템 탭 영역
create table public.post_items (
  post_id  uuid not null references public.inmyin_posts (id),
  item_id  uuid not null references public.items (id),
  x        double precision not null,
  y        double precision not null,
  w        double precision not null,
  h        double precision not null,
  primary key (post_id, item_id)
);

create index post_items_item_id_idx on public.post_items (item_id);

create table public.likes (
  user_id      uuid not null references public.users (id),
  target_type  text not null check (target_type in ('item', 'post')),
  target_id    uuid not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

-- 순위 집계는 created_at 기준으로 센다
create index likes_target_idx on public.likes (target_type, target_id);
create index likes_ranking_idx on public.likes (target_type, created_at);

create table public.follows (
  follower_id   uuid not null references public.users (id),
  following_id  uuid not null references public.users (id),
  created_at    timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

create table public.blocks (
  blocker_id  uuid not null references public.users (id),
  blocked_id  uuid not null references public.users (id),
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

-- ─────────────────────────────────────────────────────────────
-- 불변 규칙을 지키는 트리거
-- ─────────────────────────────────────────────────────────────

-- 아이템이 칸에 들어갈 때
create function public.check_item_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inventory public.inventories%rowtype;
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

  if new.slot_index >= v_inventory.slot_count then
    raise exception '칸 번호가 인벤토리 크기를 넘습니다' using errcode = 'P0001';
  end if;

  -- 아이템과 중첩 인벤토리가 같은 칸을 쓴다
  if exists (
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

create trigger items_check_slot
  before insert or update of user_id, inventory_id, slot_index, deleted_at
  on public.items
  for each row execute function public.check_item_slot();

-- 인벤토리가 다른 인벤토리 안에 들어갈 때, 그리고 크기가 바뀔 때
create function public.check_inventory_nesting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 한 줄로 이어지는 중첩 한도 (예: 집 › 방 › 가방 › 작은 가방 › 파우치)
  c_max_depth constant int := 5;
  v_parent  public.inventories%rowtype;
  v_above   int;
  v_below   int;
  v_cycle   boolean;
begin
  if new.deleted_at is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  -- 크기를 줄일 때 밖으로 밀려나는 칸이 있으면 안 된다
  if tg_op = 'UPDATE' and new.slot_count < old.slot_count then
    if exists (
      select 1 from public.items
      where inventory_id = new.id and slot_index >= new.slot_count and deleted_at is null
    ) or exists (
      select 1 from public.inventories
      where parent_inventory_id = new.id and parent_slot_index >= new.slot_count and deleted_at is null
    ) then
      raise exception '줄이려는 크기 밖의 칸에 아직 들어 있는 것이 있습니다' using errcode = 'P0001';
    end if;
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

  if new.parent_slot_index >= v_parent.slot_count then
    raise exception '칸 번호가 인벤토리 크기를 넘습니다' using errcode = 'P0001';
  end if;

  if exists (
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

create trigger inventories_check_nesting
  before insert or update of user_id, slot_count, parent_inventory_id, parent_slot_index, deleted_at
  on public.inventories
  for each row execute function public.check_inventory_nesting();

-- like_count 캐시
create function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   public.likes%rowtype;
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
    set like_count = greatest(like_count + v_delta, 0)
    where id = v_row.target_id
      and (tg_op = 'DELETE' or (deleted_at is null and (is_public or user_id = v_row.user_id)));
  else
    update public.inmyin_posts
    set like_count = greatest(like_count + v_delta, 0)
    where id = v_row.target_id
      and (tg_op = 'DELETE' or deleted_at is null);
  end if;
  v_found := found;

  -- 없는 것, 지워진 것, 비공개인 것에는 좋아요를 누를 수 없다
  if tg_op = 'INSERT' and not v_found then
    raise exception '좋아요를 누를 수 없는 대상입니다' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

create trigger likes_sync_count
  after insert or delete on public.likes
  for each row execute function public.sync_like_count();

-- 트리거 전용이다. 밖에서 직접 부를 일이 없다
revoke execute on function public.check_item_slot(), public.check_inventory_nesting(),
  public.sync_like_count()
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 권한: 전부 걷어낸 뒤 필요한 것만 준다
-- plan · like_count · user_id 처럼 유저가 직접 바꾸면 안 되는 컬럼은 빠져 있다
-- ─────────────────────────────────────────────────────────────

revoke all on public.users, public.inventories, public.items, public.inmyin_posts,
  public.post_items, public.likes, public.follows, public.blocks
  from anon, authenticated;

grant select on public.users, public.inventories, public.items, public.inmyin_posts,
  public.post_items, public.follows
  to anon, authenticated;

grant select on public.likes, public.blocks to authenticated;

grant insert (id, handle, nickname, avatar_url, bio, provider) on public.users to authenticated;
grant update (handle, nickname, avatar_url, bio, deleted_at) on public.users to authenticated;

grant insert (id, user_id, kind, name, slot_count, parent_inventory_id, parent_slot_index, sort_order)
  on public.inventories to authenticated;
grant update (kind, name, slot_count, parent_inventory_id, parent_slot_index, sort_order, deleted_at)
  on public.inventories to authenticated;

grant insert (id, user_id, inventory_id, slot_index, category, image_url, raw_image_url, name,
  description, quantity, is_public, acquired_at, expires_at)
  on public.items to authenticated;
grant update (inventory_id, slot_index, category, image_url, raw_image_url, name,
  description, quantity, is_public, acquired_at, expires_at, deleted_at)
  on public.items to authenticated;

grant insert (id, user_id, image_url, canvas_json) on public.inmyin_posts to authenticated;
grant update (image_url, canvas_json, deleted_at) on public.inmyin_posts to authenticated;

grant insert on public.post_items to authenticated;

grant insert (user_id, target_type, target_id) on public.likes to authenticated;
grant delete on public.likes to authenticated;

grant insert (follower_id, following_id) on public.follows to authenticated;
grant delete on public.follows to authenticated;

grant insert (blocker_id, blocked_id) on public.blocks to authenticated;
grant delete on public.blocks to authenticated;

-- ─────────────────────────────────────────────────────────────
-- RLS: 어느 줄을 읽고 쓸 수 있는가
-- ─────────────────────────────────────────────────────────────

alter table public.users        enable row level security;
alter table public.inventories  enable row level security;
alter table public.items        enable row level security;
alter table public.inmyin_posts enable row level security;
alter table public.post_items   enable row level security;
alter table public.likes        enable row level security;
alter table public.follows      enable row level security;
alter table public.blocks       enable row level security;

-- users: 프로필은 누구나 본다. 탈퇴한 유저는 본인만
create policy users_select on public.users
  for select to anon, authenticated
  using (deleted_at is null or id = (select auth.uid()));

create policy users_insert_own on public.users
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- inventories: 지워지지 않은 것은 누구나 본다
create policy inventories_select on public.inventories
  for select to anon, authenticated
  using (deleted_at is null or user_id = (select auth.uid()));

create policy inventories_insert_own on public.inventories
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy inventories_update_own on public.inventories
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- items: 비공개 아이템은 남에게 아예 돌려주지 않는다
create policy items_select on public.items
  for select to anon, authenticated
  using (user_id = (select auth.uid()) or (is_public and deleted_at is null));

create policy items_insert_own on public.items
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy items_update_own on public.items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- inmyin_posts
create policy inmyin_posts_select on public.inmyin_posts
  for select to anon, authenticated
  using (deleted_at is null or user_id = (select auth.uid()));

create policy inmyin_posts_insert_own on public.inmyin_posts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy inmyin_posts_update_own on public.inmyin_posts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- post_items: 내 게시물에 내 아이템만 건다
create policy post_items_select on public.post_items
  for select to anon, authenticated
  using (true);

create policy post_items_insert_own on public.post_items
  for insert to authenticated
  with check (
    exists (select 1 from public.inmyin_posts p where p.id = post_id and p.user_id = (select auth.uid()))
    and exists (select 1 from public.items i where i.id = item_id and i.user_id = (select auth.uid()))
  );

-- likes: 누가 무엇을 좋아했는지는 본인만 본다. 남에게는 like_count 만 보인다
create policy likes_select_own on public.likes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy likes_insert_own on public.likes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy likes_delete_own on public.likes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- follows: 팔로워 · 팔로잉 목록은 누구나 본다
create policy follows_select on public.follows
  for select to anon, authenticated
  using (true);

create policy follows_insert_own on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()));

create policy follows_delete_own on public.follows
  for delete to authenticated
  using (follower_id = (select auth.uid()));

-- blocks: 차단 목록은 본인만 본다
create policy blocks_select_own on public.blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy blocks_insert_own on public.blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()));

create policy blocks_delete_own on public.blocks
  for delete to authenticated
  using (blocker_id = (select auth.uid()));
