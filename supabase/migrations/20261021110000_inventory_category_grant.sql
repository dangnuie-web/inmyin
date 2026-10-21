-- 고정 카테고리 칸(20261021100000)에 쓰기 권한. 이 표는 init 에서 revoke all 뒤 칸마다 grant 한다.
-- 자기 인벤토리만 쓰는 건 기존 정책(inventories_insert_own · inventories_update_own)이 막는다.
-- 되돌리기: revoke insert (category), update (category) on public.inventories from authenticated;
grant insert (category) on public.inventories to authenticated;
grant update (category) on public.inventories to authenticated;
