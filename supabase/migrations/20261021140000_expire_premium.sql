-- 프리미엄 기간 끝난 사람을 베이직으로 (하루 한 번 예약 실행 /api/cron/daily 가 부른다, lib/membership/expire.ts).
--
-- 바꾸는 것은 users.plan 하나뿐이다. 이미 만든 인벤토리 · 늘어난 칸(slot_count 50) · 물건은 그대로 둔다.
-- 베이직 한도는 새로 만들 때만 걸린다 — 새 인벤토리 만들기 · 되살리기(maxInventories), 북마크 추가(maxBookmarks), 새 인벤토리 칸 수(slotCount).
-- 한도는 lib/plans.ts 에서 읽는다. DB 는 한도를 모른다.
--
-- 이용 기간(memberships)이 있는 사람만 본다 — 기록 없이 프리미엄인 계정(손으로 바꾼 시험 계정 등)은 건드리지 않는다.
-- 같은 순간에 연장 결제(complete_premium_order)가 끝나는 경우: 이용 기간 줄을 먼저 잠그고(for update skip locked),
-- 잠근 뒤에도 기간이 지났는지 다시 본다 — 방금 연장한 사람을 베이직으로 돌리지 않는다.
-- 돌려준 값은 베이직이 된 사람 수.

create function public.expire_premium_memberships()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_count int := 0;
begin
  for v_user in
    select m.user_id
      from public.memberships m
      join public.users u on u.id = m.user_id
     where m.premium_until <= now() and u.plan = 'premium'
       for update of m skip locked
  loop
    update public.users u
       set plan = 'basic'
     where u.id = v_user
       and u.plan = 'premium'
       and exists (select 1 from public.memberships m where m.user_id = v_user and m.premium_until <= now());
    if found then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.expire_premium_memberships() from public, anon, authenticated;
grant execute on function public.expire_premium_memberships() to service_role;
