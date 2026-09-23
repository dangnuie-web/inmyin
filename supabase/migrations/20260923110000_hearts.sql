-- 하트. 게시물(아이템 · INMYIN)에 반응해 주는 것 — 한 사람이 한 게시물에 한 번, 한도 없음, 모아 보는 곳 없음.
-- 북마크(bookmarks)와 같은 꼴이지만 역할이 다르다: 북마크는 모으기 · 순위, 하트는 반응. 화면에 보이는 수는 하트 수다

create table public.hearts (
  user_id      uuid not null references public.users (id),
  target_type  text not null check (target_type in ('item', 'post')),
  target_id    uuid not null,
  created_at   timestamptz not null default now(),
  -- (누른 사람, 대상) 이 기본키라 한 사람이 한 번만 누를 수 있다
  primary key (user_id, target_type, target_id)
);

create index hearts_target_idx on public.hearts (target_type, target_id);

-- 캐시. hearts 트리거만 바꾼다. 화면의 "하트 수"가 이것이다
alter table public.items        add column heart_count int not null default 0;
alter table public.inmyin_posts add column heart_count int not null default 0;

create function public.sync_heart_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row   public.hearts%rowtype;
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
    set heart_count = greatest(heart_count + v_delta, 0)
    where id = v_row.target_id
      and (tg_op = 'DELETE' or (deleted_at is null and (is_public or user_id = v_row.user_id)));
  else
    update public.inmyin_posts
    set heart_count = greatest(heart_count + v_delta, 0)
    where id = v_row.target_id
      and (tg_op = 'DELETE' or deleted_at is null);
  end if;
  v_found := found;

  -- 없는 것, 지워진 것, 비공개인 것에는 하트를 누를 수 없다
  if tg_op = 'INSERT' and not v_found then
    raise exception '하트를 누를 수 없는 대상입니다' using errcode = 'P0001';
  end if;

  return v_row;
end;
$$;

create trigger hearts_sync_count
  after insert or delete on public.hearts
  for each row execute function public.sync_heart_count();

-- 트리거 전용이다. 밖에서 직접 부를 일이 없다
revoke execute on function public.sync_heart_count() from public, anon, authenticated;

-- 권한: 북마크와 같다. 누가 하트했는지는 본인만 보고, 남에게는 heart_count 만 보인다
revoke all on public.hearts from anon, authenticated;
grant select on public.hearts to authenticated;
grant insert (user_id, target_type, target_id) on public.hearts to authenticated;
grant delete on public.hearts to authenticated;

alter table public.hearts enable row level security;

create policy hearts_select_own on public.hearts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy hearts_insert_own on public.hearts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy hearts_delete_own on public.hearts
  for delete to authenticated
  using (user_id = (select auth.uid()));
