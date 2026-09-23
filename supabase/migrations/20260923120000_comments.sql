-- 댓글. 게시물(아이템 · INMYIN)에 다는 짧은 글 — 답글은 없다.
-- 삭제는 deleted_at 기록 (물리 삭제 없음 — 규칙 6). 쓴 사람과 게시물 주인이 지울 수 있다.
-- 차단 사이에는 서로의 댓글이 안 보인다 (blocked_between)

create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id),
  target_type  text not null check (target_type in ('item', 'post')),
  target_id    uuid not null,
  body         text not null check (char_length(body) between 1 and 500),
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- 한 게시물의 댓글을 시간순으로
create index comments_target_idx on public.comments (target_type, target_id, created_at) where deleted_at is null;

-- 캐시. comments 트리거만 바꾼다
alter table public.items        add column comment_count int not null default 0;
alter table public.inmyin_posts add column comment_count int not null default 0;

-- 새 댓글이면 +1, 지우면(deleted_at 이 생기면) −1
create function public.sync_comment_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_delta int;
  v_found boolean;
begin
  if tg_op = 'INSERT' then
    v_delta := 1;
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_delta := -1;
  elsif old.deleted_at is not null and new.deleted_at is null then
    v_delta := 1;
  else
    return new;
  end if;

  if new.target_type = 'item' then
    update public.items
    set comment_count = greatest(comment_count + v_delta, 0)
    where id = new.target_id
      and (tg_op = 'UPDATE' or (deleted_at is null and (is_public or user_id = new.user_id)));
  else
    update public.inmyin_posts
    set comment_count = greatest(comment_count + v_delta, 0)
    where id = new.target_id
      and (tg_op = 'UPDATE' or deleted_at is null);
  end if;
  v_found := found;

  -- 없는 것, 지워진 것, 비공개인 것에는 댓글을 달 수 없다
  if tg_op = 'INSERT' and not v_found then
    raise exception '댓글을 달 수 없는 대상입니다' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger comments_sync_count
  after insert or update of deleted_at on public.comments
  for each row execute function public.sync_comment_count();

-- 트리거 전용이다. 밖에서 직접 부를 일이 없다
revoke execute on function public.sync_comment_count() from public, anon, authenticated;

-- 권한. 읽기는 누구나(게시물이 보이는 만큼), 쓰기는 본인 이름으로만, 고칠 수 있는 것은 deleted_at 뿐
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (user_id, target_type, target_id, body) on public.comments to authenticated;
grant update (deleted_at) on public.comments to authenticated;

alter table public.comments enable row level security;

-- 지워지지 않았고, 그 게시물이 나에게 보이고(items · inmyin_posts 의 읽기 규칙이 정한다), 쓴 사람과 차단 사이가 아닐 때
create policy comments_select on public.comments
  for select to anon, authenticated
  using (
    deleted_at is null
    and not public.blocked_between(user_id)
    and case target_type
      when 'item' then exists (select 1 from public.items i where i.id = target_id)
      else exists (select 1 from public.inmyin_posts p where p.id = target_id)
    end
  );

create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- 지우기(deleted_at 기록): 쓴 사람, 또는 그 게시물의 주인
create policy comments_update_own_or_owner on public.comments
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or case target_type
      when 'item' then exists (select 1 from public.items i where i.id = target_id and i.user_id = (select auth.uid()))
      else exists (select 1 from public.inmyin_posts p where p.id = target_id and p.user_id = (select auth.uid()))
    end
  );
