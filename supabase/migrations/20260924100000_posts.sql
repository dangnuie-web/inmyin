-- INMYIN 포스팅(M-11)을 위한 변경. 게시물에 제목 · 내용 칸, 완성 이미지를 담을 저장소(버킷) 하나.
-- 파일 경로는 <유저 id>/<게시물 id>.jpg (완성 이미지), <유저 id>/<게시물 id>-<개체 id>.<확장자> (캔버스에 올린 갤러리 사진)

alter table public.inmyin_posts
  add column title       text not null default '' check (char_length(title) <= 40),
  add column description text check (char_length(description) <= 500);

grant insert (title, description) on public.inmyin_posts to authenticated;
grant update (title, description) on public.inmyin_posts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- 피드에 나가는 이미지라 누구나 본다. 완성 이미지(1080×1350 JPG)와 갤러리 사진
  ('posts', 'posts', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- 자기 폴더에만 올린다. 고치거나 지우는 권한은 주지 않는다 (게시물 삭제는 deleted_at — 규칙 6)
create policy post_images_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy post_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'posts'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
