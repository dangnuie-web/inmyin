-- 웹 푸시 구독. 알림을 켠 기기(브라우저 · 홈 화면 앱) 하나가 한 줄이다 — 폰과 노트북에서 켰으면 두 줄.
-- endpoint 는 브라우저 회사(애플 · 구글 · 모질라)의 푸시 서버 주소, p256dh · auth 는 내용을 잠그는 열쇠.
-- 보내기는 서버(lib/push/send.ts)가 서비스 키로 읽어서 한다. 화면에서는 내 줄만 보고 고친다.
-- 기존 표는 건드리지 않는다.

create table public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  -- 같은 기기에서 다른 계정으로 다시 켜면 그 계정으로 넘어간다 (한 기기 = 한 줄)
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  -- 받을 종류. 설정 › 알림에서 고른다 (lib/push/messages.ts PUSH_KINDS)
  kinds           text[] not null default array['follow', 'heart', 'comment', 'expiry']::text[]
                  check (kinds <@ array['follow', 'heart', 'comment', 'expiry']::text[]),
  -- 유통기한 임박 알림을 마지막으로 살핀 날(한국 날짜). 하루 한 번 · 같은 물건 두 번 안 보내기 (lib/push/expiry.ts)
  expiry_sent_on  date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- 권한: 로그인한 사람이 자기 줄만 읽고 쓴다
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_select_own on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy push_subscriptions_insert_own on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy push_subscriptions_update_own on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_subscriptions_delete_own on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));
