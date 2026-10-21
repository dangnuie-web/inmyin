-- 인벤토리의 고정 카테고리 (2026-10-19 당니님 결정 · 오피스 로드맵 3단계 ⑧).
-- 홈 · 발견 칩 전용 8개 중 하나. 자유 태그(categories)는 그대로 — 내 인벤토리 안에서만 쓴다.
-- 처음엔 비어 있다(기존 인벤토리). 앱이 한 번 골라 달라고 안내한다.
-- 값은 lib/categories.ts 의 FIXED_CATEGORIES 와 같아야 한다 (scripts/demo/lib.mjs 도)
alter table public.inventories
  add column category text,
  add constraint inventories_category_check check (
    category is null
    or category in ('가방', '데스크', '파우치', '옷장', '굿즈·수집', '취미', '집·주방', '여행·아웃도어')
  );

