-- Home 피드(H-01)의 카테고리 칩 — 공개 아이템에서 많이 쓰인 태그 순.
-- security invoker(기본)라 읽는 사람의 권한으로 돈다: 남에게 안 보이는 아이템은 세지 않는다 (RLS)
create or replace function public.popular_item_categories(max_count int default 12)
returns table (category text, item_count bigint)
language sql
stable
set search_path = public
as $$
  select category, count(*) as item_count
  from public.items
  where category is not null and deleted_at is null
  group by category
  order by item_count desc, category
  limit max_count;
$$;

grant execute on function public.popular_item_categories(int) to anon, authenticated;
