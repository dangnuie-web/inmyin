-- 프로필 관리를 위한 변경. 프로필 사진을 담을 저장소(버킷) 하나.
-- 파일 경로는 <유저 id>/<무작위 id>.<webp 또는 jpg>. 사진을 바꿀 때마다 새 파일로 올린다 —
-- 같은 이름으로 덮어쓰면 브라우저가 옛 사진을 계속 보여준다.
-- 프로필 사진은 원본을 따로 두지 않는다 (배경을 지우는 사진이 아니다).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- 프로필은 누구나 볼 수 있으니 주소만 알면 열린다
  ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png']);

-- 자기 폴더에만 올린다. 고치거나 지우는 권한은 주지 않는다
create policy avatar_images_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy avatar_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
