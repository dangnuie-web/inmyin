-- 인벤토리 목록과 생성(M-03)을 위한 변경.
-- 1) 종류(kind)를 없앤다 — 카테고리가 인벤토리마다 유저가 정하는 자유 태그가 되었다
-- 2) 태그 목록과 사진(썸네일 + 원본) 컬럼을 더한다
-- 3) 인벤토리 사진을 담을 저장소(버킷) 두 개를 만든다

-- ─────────────────────────────────────────────────────────────
-- 컬럼
-- ─────────────────────────────────────────────────────────────

alter table public.inventories drop column kind;

alter table public.inventories
  add column categories    text[] not null default '{}',
  -- 사진은 없어도 된다. 없으면 목록과 격자에서 회색 칸으로 보인다
  add column image_url     text,
  add column raw_image_url text,
  -- 원본과 썸네일은 항상 같이 있다
  add constraint inventories_image_pair check ((image_url is null) = (raw_image_url is null));

-- 태그는 10개까지, 한 개에 1~10자, 앞뒤 공백 없음, 중복 없음.
-- 숫자는 lib/categories.ts 의 MAX_CATEGORIES · MAX_CATEGORY_LENGTH 와 같아야 한다
create function public.is_valid_categories(p_categories text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(p_categories, 1), 0) <= 10
    and not exists (
      select 1
      from unnest(p_categories) as t (tag)
      where tag is null
        or char_length(tag) not between 1 and 10
        or tag <> btrim(tag)
    )
    and (select count(distinct tag) from unnest(p_categories) as t (tag))
      = coalesce(array_length(p_categories, 1), 0);
$$;

alter table public.inventories
  add constraint inventories_categories_check check (public.is_valid_categories(categories));

-- 새 컬럼도 본인이 넣고 고칠 수 있게 한다 (kind 에 걸려 있던 권한은 컬럼과 함께 사라졌다)
grant insert (categories, image_url, raw_image_url) on public.inventories to authenticated;
grant update (categories, image_url, raw_image_url) on public.inventories to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 사진 저장소. 파일 경로는 <유저 id>/<인벤토리 id>.<webp 또는 jpg>
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- 썸네일: 인벤토리는 누구나 볼 수 있으니 주소만 알면 열린다
  ('inventories', 'inventories', true, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  -- 원본: 본인만 읽는다. 나중에 배경을 다시 따낼 때 쓴다
  ('inventories-raw', 'inventories-raw', false, 5242880, array['image/webp', 'image/jpeg', 'image/png']);

-- 자기 폴더에만 올리고 고친다. 지우는 권한은 주지 않는다 — 삭제는 deleted_at 기록뿐이다
create policy inventory_images_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id in ('inventories', 'inventories-raw')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy inventory_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('inventories', 'inventories-raw')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy inventory_images_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id in ('inventories', 'inventories-raw')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('inventories', 'inventories-raw')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
