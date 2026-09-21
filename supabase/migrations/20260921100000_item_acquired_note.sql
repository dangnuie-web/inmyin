-- 획득날짜 칸에는 날짜 대신 "20살 생일" 같은 말도 적을 수 있다 (피그마 M-08 · 아이템 정보 입력).
-- 달력으로 고른 날짜도 "26.09.22" 같은 글자로 들어간다.
-- 아이템이 아직 하나도 없을 때 바꾼다 — 잃는 데이터가 없다.
alter table public.items rename column acquired_at to acquired_note;

alter table public.items
  alter column acquired_note type text using acquired_note::text,
  -- lib/item/rules.ts 의 ACQUIRED_NOTE_MAX 와 같아야 한다
  add constraint items_acquired_note_length check (char_length(acquired_note) <= 20);
