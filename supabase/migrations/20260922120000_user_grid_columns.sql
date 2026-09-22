-- 격자 한 줄의 칸 수. 3 이 좋은 사람도 4 가 좋은 사람도 있어서 설정(M-02)에서 고른다.
-- 계정에 저장하므로 폰에서 정한 값이 컴퓨터에서도 같다. 5 는 써 보니 너무 작아서 뺐다
alter table public.users
  add column grid_columns smallint not null default 4 check (grid_columns in (3, 4));

grant update (grid_columns) on public.users to authenticated;
