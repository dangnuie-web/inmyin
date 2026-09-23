-- 게시물 읽기 규칙에 차단을 더한다 (아이템 · 인벤토리와 같게). 차단 사이면 서로의 INMYIN 이 홈 · 검색 · 프로필 어디서도 안 보인다.
-- 내 것은 지웠어도 나에게는 보인다 (되돌리기 등)
drop policy inmyin_posts_select on public.inmyin_posts;
create policy inmyin_posts_select on public.inmyin_posts
  for select to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (deleted_at is null and not public.blocked_between(user_id))
  );
