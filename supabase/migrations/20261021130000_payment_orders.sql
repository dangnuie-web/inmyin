-- 프리미엄 한 달 이용권 결제 (토스페이먼츠 결제창, 4단계는 테스트 모드 — 실제 돈은 안 나간다).
--
-- 흐름: 결제 버튼 → 서버가 주문(payment_orders, status 'ready')을 먼저 만든다 → 토스 결제창 →
-- 토스가 successUrl(/api/payments/toss/success)로 돌려보냄 → 서버가 주문을 'confirming' 으로 잡고(두 번 승인 막기) →
-- 금액이 주문과 같은지 본 뒤 토스 승인 API → 성공이면 complete_premium_order 로 한 번에 'done' + 프리미엄.
-- 브라우저가 보낸 금액은 믿지 않는다. 승인 API 에는 늘 주문에 적힌 금액을 보낸다 (lib/payments/confirm.ts).
--
-- 화면(로그인한 사람)은 주문 표를 읽지도 쓰지도 못한다 — 서버가 서비스 키(lib/supabase/admin.ts)로만 다룬다.
-- 이용 기간(memberships)은 자기 것만 읽는다(플랜 화면의 "언제까지"). 쓰기는 서버만.
-- 기존 표의 모양은 바꾸지 않는다. 승인될 때 users.plan(이미 화면에서 못 바꾸는 칸)과 그 사람 인벤토리의 slot_count 값을 바꾼다.

create table public.payment_orders (
  -- 토스 규칙: 영문 · 숫자 · - _ = 로 6~64자
  order_id      text primary key check (order_id ~ '^[A-Za-z0-9_=-]{6,64}$'),
  user_id       uuid not null references public.users (id),
  plan          text not null check (plan in ('premium')),
  -- 원. 값은 lib/plans.ts PREMIUM_PASS 에서 온다
  amount        int  not null check (amount > 0),
  months        int  not null check (months > 0),
  -- ready: 만들어 둠 · confirming: 승인 중(한 요청만 잡는다) · done: 승인됨 · failed: 토스가 거절
  status        text not null default 'ready' check (status in ('ready', 'confirming', 'done', 'failed')),
  -- 토스가 준 결제 키. 한 결제가 두 주문에 쓰이지 않게 unique
  payment_key   text unique,
  fail_code     text,
  created_at    timestamptz not null default now(),
  approved_at   timestamptz
);

create index payment_orders_user_idx on public.payment_orders (user_id, created_at desc);

-- 프리미엄 이용 기간. 한 사람에 한 줄. 자동 결제(빌링)는 없다 — 기간이 지나면 하루 한 번 예약 실행이 베이직으로 돌린다(20261021140000_expire_premium.sql)
create table public.memberships (
  user_id        uuid primary key references public.users (id),
  premium_until  timestamptz not null,
  updated_at     timestamptz not null default now()
);

-- 권한: 주문은 서버만. 이용 기간은 자기 것 읽기만
revoke all on public.payment_orders, public.memberships from anon, authenticated;
grant select on public.memberships to authenticated;
grant all on public.payment_orders, public.memberships to service_role;

alter table public.payment_orders enable row level security;
alter table public.memberships enable row level security;

create policy memberships_select_own on public.memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

-- 승인된 주문을 한 번에 마무리한다: 주문 'done' + 이용 기간 늘리기 + plan 'premium' + 인벤토리 칸 늘리기.
-- 'confirming' 인 주문만 받는다 — 같은 주문을 두 번 마무리하지 않는다. 마무리했으면 그 사람 id, 아니면 null.
-- 기간: 아직 남아 있으면 그 끝에서, 끝났거나 처음이면 지금부터 months 달.
-- 칸 수(p_slot_count)는 DB가 모르는 값이라 서버가 lib/plans.ts 에서 넘긴다. 줄이지는 않는다(greatest)
create function public.complete_premium_order(p_order_id text, p_payment_key text, p_slot_count int)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_months int;
begin
  update public.payment_orders
     set status = 'done', payment_key = p_payment_key, approved_at = now(), fail_code = null
   where order_id = p_order_id and status = 'confirming'
  returning user_id, months into v_user, v_months;

  if v_user is null then
    return null;
  end if;

  insert into public.memberships as m (user_id, premium_until)
  values (v_user, now() + make_interval(months => v_months))
  on conflict (user_id) do update
    set premium_until = greatest(m.premium_until, now()) + make_interval(months => v_months),
        updated_at = now();

  update public.users set plan = 'premium' where id = v_user;

  update public.inventories
     set slot_count = p_slot_count
   where user_id = v_user and deleted_at is null and slot_count < p_slot_count;

  return v_user;
end;
$$;

revoke execute on function public.complete_premium_order(text, text, int) from public, anon, authenticated;
grant execute on function public.complete_premium_order(text, text, int) to service_role;
