-- 알림. 팔로우 · 하트 · 댓글이 생기면 받는 사람에게 한 줄씩 쌓인다 — 화면이 아니라 DB 트리거가 만든다.
-- 어느 화면에서 눌러도 빠짐없이 쌓이고, 취소(언팔로우 · 하트 끄기 · 댓글 삭제)하면 같이 사라진다.
-- 내 것에 내가 한 것은 만들지 않는다. 공지(announcements)는 따로 두고 주인이 대시보드에서 넣는다.

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  -- 받는 사람
  user_id      uuid not null references public.users (id),
  kind         text not null check (kind in ('follow', 'heart', 'comment')),
  -- 한 사람
  actor_id     uuid not null references public.users (id),
  -- 하트 · 댓글의 대상. 팔로우는 비어 있다
  target_type  text check (target_type in ('item', 'post')),
  target_id    uuid,
  -- 댓글 알림이면 그 댓글
  comment_id   uuid references public.comments (id),
  created_at   timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- 같은 사람이 같은 것에 하트를 껐다 켰다 해도(팔로우도) 알림은 하나. 댓글은 하나하나가 다른 알림이다
create unique index notifications_once on public.notifications (user_id, kind, actor_id, coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where kind <> 'comment';

-- 마지막으로 알림 화면을 본 시각. 이보다 새 알림이 있으면 종에 빨간 점
alter table public.users add column notifications_seen_at timestamptz;
grant update (notifications_seen_at) on public.users to authenticated;

-- 권한: 받는 사람이 읽기만. 쓰고 지우는 것은 트리거(security definer)뿐
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

alter table public.notifications enable row level security;

-- 내 알림만, 차단 사이의 사람이 한 것은 빼고
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()) and not public.blocked_between(actor_id));

-- ─────────────────────────────────────────────────────────────
-- 트리거
-- ─────────────────────────────────────────────────────────────

-- 게시물의 주인
create function public.target_owner(p_type text, p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'item' then (select user_id from public.items where id = p_id)
    else (select user_id from public.inmyin_posts where id = p_id)
  end
$$;

-- 팔로우: 팔로우당한 사람에게
create function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, actor_id)
    values (new.following_id, 'follow', new.follower_id)
    on conflict do nothing;
    return new;
  end if;
  delete from public.notifications
  where kind = 'follow' and user_id = old.following_id and actor_id = old.follower_id;
  return old;
end;
$$;

create trigger follows_notify
  after insert or delete on public.follows
  for each row execute function public.notify_follow();

-- 하트: 게시물 주인에게 (내 것에 내가 누른 건 빼고)
create function public.notify_heart()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if tg_op = 'INSERT' then
    v_owner := public.target_owner(new.target_type, new.target_id);
    if v_owner is not null and v_owner <> new.user_id then
      insert into public.notifications (user_id, kind, actor_id, target_type, target_id)
      values (v_owner, 'heart', new.user_id, new.target_type, new.target_id)
      on conflict do nothing;
    end if;
    return new;
  end if;
  delete from public.notifications
  where kind = 'heart' and actor_id = old.user_id and target_type = old.target_type and target_id = old.target_id;
  return old;
end;
$$;

create trigger hearts_notify
  after insert or delete on public.hearts
  for each row execute function public.notify_heart();

-- 댓글: 게시물 주인에게 (내 것에 내가 단 건 빼고). 댓글을 지우면 알림도 지운다
create function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if tg_op = 'INSERT' then
    v_owner := public.target_owner(new.target_type, new.target_id);
    if v_owner is not null and v_owner <> new.user_id then
      insert into public.notifications (user_id, kind, actor_id, target_type, target_id, comment_id)
      values (v_owner, 'comment', new.user_id, new.target_type, new.target_id, new.id);
    end if;
    return new;
  end if;
  if new.deleted_at is not null then
    delete from public.notifications where comment_id = new.id;
  end if;
  return new;
end;
$$;

create trigger comments_notify
  after insert or update of deleted_at on public.comments
  for each row execute function public.notify_comment();

-- 트리거 전용이다. 밖에서 직접 부를 일이 없다
revoke execute on function public.target_owner(text, uuid), public.notify_follow(), public.notify_heart(), public.notify_comment()
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 공지. 주인이 Supabase 대시보드 › Table Editor 에서 한 줄 넣으면 모두의 알림 목록 맨 위에 뜬다.
-- 앱에서는 읽기만 한다 (쓰는 권한이 없다)
-- ─────────────────────────────────────────────────────────────

create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text,
  -- 누르면 갈 곳 (선택). 앱 안의 주소 (예: /my/settings) 나 바깥 링크
  link        text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to anon, authenticated;

alter table public.announcements enable row level security;

create policy announcements_select on public.announcements
  for select to anon, authenticated
  using (deleted_at is null);

-- 안 본 알림이 있는가 — 종의 빨간 점. 마지막으로 본 시각이 없으면(한 번도 안 열었으면) 가입 시각과 비교한다:
-- 가입 전의 공지는 새것이 아니다
create function public.has_unread_notifications()
returns boolean
language sql
stable
set search_path = public
as $$
  with me as (
    select coalesce(notifications_seen_at, created_at) as since
    from public.users where id = (select auth.uid())
  )
  select exists (select 1 from public.notifications n, me where n.user_id = (select auth.uid()) and n.created_at > me.since)
      or exists (select 1 from public.announcements a, me where a.deleted_at is null and a.created_at > me.since)
$$;

revoke all on function public.has_unread_notifications() from public;
grant execute on function public.has_unread_notifications() to authenticated;
