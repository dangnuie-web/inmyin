# 데이터 모델

테이블 11개 + 연결 테이블 1개로 전체 기능이 돌아간다.

```
User ──< Inventory ──< Item
 │           └──< Inventory (중첩)
 ├──< InmyinPost ──< PostItem >── Item
 ├──< Bookmark
 ├──< Heart
 ├──< Comment
 ├──< Notification
 ├──< Follow
 └──< Block

Announcement (주인이 쓰는 공지 — 유저와 연결 없음)
```

## 테이블

| 테이블 | 주요 필드 | 메모 |
| --- | --- | --- |
| `User` | id, handle, nickname, avatarUrl, bio, plan, provider, gridColumns, notificationsSeenAt, createdAt, deletedAt | plan = `basic` \| `premium`. gridColumns = 격자 한 줄의 칸 수, 3 \| 4 (설정 M-02). notificationsSeenAt = 알림 화면을 마지막으로 본 시각 (종의 빨간 점 기준) |
| `Inventory` | id, userId, name, categories, imageUrl, rawImageUrl, slotCount, isPublic, parentInventoryId, parentSlotIndex, order, createdAt, deletedAt | categories = 유저가 정한 태그 목록. 사진은 필수다 — 만들기가 항상 사진 고르기로 시작한다. isPublic 이 꺼지면 안의 아이템 · 담긴 인벤토리까지 남에게 숨는다 |
| `Item` | id, userId, inventoryId, slotIndex, category, imageUrl, rawImageUrl, name, description, quantity, isPublic, acquiredNote, expiresAt, bookmarkCount, heartCount, commentCount, createdAt, deletedAt | rawImageUrl = 배경제거 전 원본. acquiredNote = 획득날짜 칸. 날짜가 아니라 글자다 ("20살 생일", "26.09.22") |
| `InmyinPost` | id, userId, imageUrl, canvasJson, bookmarkCount, heartCount, commentCount, createdAt, deletedAt | |
| `PostItem` | postId, itemId, x, y, w, h | 게시물 ↔ 아이템 탭 영역 |
| `Bookmark` | userId, targetType, targetId, createdAt | targetType = `item` \| `post`. 모아 두는 것 — Bookmark 탭 · 플랜 한도 · 순위의 재료. 처음엔 `Like` 였고 이름만 바꿨다 |
| `Heart` | userId, targetType, targetId, createdAt | 반응. (userId, targetType, targetId) 가 기본키라 한 사람이 한 번. 한도 없음, 모아 보는 곳 없음 — 수(`heartCount`)만 화면에 보인다 |
| `Comment` | id, userId, targetType, targetId, body, createdAt, deletedAt | 댓글. 답글 없음(부모 없음). body 는 1~500자. 삭제는 `deletedAt` — 쓴 사람과 게시물 주인이 지울 수 있다 (DB 규칙) |
| `Notification` | id, userId(받는 사람), kind, actorId(한 사람), targetType, targetId, commentId, createdAt | kind = `follow` \| `heart` \| `comment`. **앱이 쓰지 않는다** — follows · hearts · comments 의 트리거가 만들고 지운다. 하트 · 팔로우는 (받는 사람, 종류, 한 사람, 대상) 당 하나 |
| `Announcement` | id, title, body, link, createdAt, deletedAt | 공지. 주인이 대시보드에서 넣는다 (앱에는 쓰는 권한이 없다). 모두에게 보인다 |
| `Follow` | followerId, followingId, createdAt | |
| `Block` | blockerId, blockedId, createdAt | 2단계 |

## 불변 규칙

1. **부모는 항상 하나다.** `Item.inventoryId` 와 `Inventory.parentInventoryId` 모두 단일 값. 이동은 이 값을 바꾸는 것이고, 복사는 존재하지 않는다. 짐싸기는 `inventoryId` + `slotIndex` 한 줄 업데이트로 끝난다
2. **한 칸에 하나.** `(inventoryId, slotIndex)` 에 unique 제약. 아이템과 중첩 인벤토리가 같은 칸을 쓴다
3. **이미 부모가 있는 인벤토리는 다른 곳에 담을 수 없다.** `parentInventoryId IS NULL` 인 것만 담기 대상. 한 줄로 이어지는 중첩은 **5겹까지**이고, 자기 자신이나 자기 안에 든 인벤토리 속으로 들어가는 순환은 DB 트리거가 막는다
4. **`slotIndex` 는 자리 번호가 아니라 순서 번호다.** 화면은 `slotIndex` 순으로 빈틈 없이 줄 세워 그린다 — 그래서 중간 것을 지우면 뒤의 것들이 저절로 한 칸씩 당겨 붙는다. 새 아이템은 가장 큰 번호 + 1 을 받는다. **지웠다가 되살린 아이템은 옛 번호를 그대로 다시 쓴다** — 남은 것들의 번호가 그대로라서 원래 이웃들 사이로 돌아간다 (그 번호를 그사이 다른 것이 차지했으면 맨 뒤로). 꽉 찼는지는 번호가 아니라 **든 것의 개수**(아이템 수 + 담긴 인벤토리 수)를 `slotCount` 와 비교해 판단한다. `slotCount`는 플랜 상수에서 온다. (처음 만든 DB 트리거는 `slotIndex < slotCount` 를 검사한다 — 아이템 등록을 만들 때 개수 기준으로 바꾼다)
5. **삭제는 `deletedAt` 기록.** 물리 삭제 금지 — 과거 INMYIN 게시물이 아이템을 참조한다
6. **`bookmarkCount` · `heartCount` · `commentCount` 는 캐시.** DB 트리거가 센다. 북마크 수는 화면에 보여주지 않고 순위에만 쓴다 — 정확한 순위 집계는 `Bookmark.createdAt` 기준으로 따로 한다. 하트 수는 화면에 보이는 그 수다

## 카테고리는 인벤토리에 저장한다

카테고리는 인벤토리마다 유저가 정하는 자유 태그다. 따로 테이블을 두지 않고 `Inventory.categories` (글자 배열) 에 담는다. 인벤토리당 10개, 한 개에 10자까지, 중복 없음 — DB 제약으로도 막는다.

`Item.category` 는 태그 하나를 담는 문자열이고, 없으면 `null`. 고를 때는 그 아이템이 든 인벤토리의 `categories` 를 칩으로 보여준다. 인벤토리에서 태그를 지우거나 짐싸기로 아이템을 옮겨도 `Item.category` 는 건드리지 않는다.

`lib/categories.ts` 에는 추천 4종만 상수로 남는다. 인벤토리를 만들 때 이름과 기본 태그를 채워주는 지름길이고, 저장된 데이터와는 연결이 없다. 인벤토리에 "종류(kind)" 는 없다.

```ts
export const RECOMMENDED_INVENTORIES = [
  { name: '옷장',     categories: ['상의', '하의', '신발', '모자', '가방'] },
  { name: '냉장고',   categories: ['육류', '야채', '반찬', '냉동', '조미료'] },
  { name: '집',       categories: ['거실', '침실', '화장실'] },
  { name: '생활용품', categories: ['청소', '세탁', '소모품'] },
] as const
```

## 플랜 한도도 DB에 없다

```ts
export const PLANS = {
  basic:   { maxInventories: 5,  slotCount: 25, maxBookmarks: 500 },
  premium: { maxInventories: 20, slotCount: 50, maxBookmarks: 2000 },
} as const
```

## 순위 쿼리

`lib/ranking.ts`. 인기는 **북마크 수**로 센다 — 하트는 가벼운 반응이라 순위에 넣지 않는다.

```sql
-- 인기: 최근 24시간
SELECT target_id, count(*) AS score
FROM bookmarks
WHERE target_type = 'post' AND created_at > now() - interval '24 hours'
GROUP BY target_id ORDER BY score DESC;

-- 추천: 누적 북마크 100 미만 유저 중, 최근 1시간
```

`RECOMMEND_THRESHOLD = 100` 을 상수로 둔다.

## 비공개 아이템 · 인벤토리 읽기

저장은 칸 번호 그대로. 남의 프로필에서 읽을 때만 `isPublic = true` 인 것을 모아 인덱스를 다시 매긴다. 내 화면에서는 원래 칸 위치 그대로 보인다.

인벤토리가 비공개면 그 안의 것은 아이템이 공개여도 남에게 보이지 않고, 안에 담긴 인벤토리도 같이 숨는다. 이것은 앱 코드가 아니라 DB 의 읽기 규칙(RLS)이 막는다 — `inventory_visible(id)` 함수가 그 인벤토리와 위의 인벤토리들(최대 5겹)이 모두 공개인지 본다. 그래서 어떤 화면을 새로 만들어도 남의 비공개 것이 새어 나갈 수 없다.

## 이미지 저장

| 용도 | 버킷 | 비고 |
| --- | --- | --- |
| 아이템 썸네일 (배경 제거됨) | `items` | 격자에 표시. 촬영 화면(M-06)에서 찍었으면 프레임 안쪽만 잘라낸 것 |
| 아이템 원본 | `items-raw` | 장변 1280px로 줄여 보관. 찍었으면 프레임 밖까지 담긴 전체 사진 |
| 인벤토리 썸네일 | `inventories` | 목록과 부모 격자의 칸에 표시 |
| 인벤토리 원본 | `inventories-raw` | 아이템 원본과 같은 방식 |
| 프로필 사진 | `avatars` | 긴 변 320px. 원본은 따로 두지 않는다. 바꿀 때마다 새 파일 |
| INMYIN 최종 이미지 | `posts` | 피드 노출용 |

원본을 보관하는 이유는 배경제거 모델이 나아졌을 때 다시 따낼 수 있어야 하기 때문이다.

썸네일의 배경은 편집(M-07)에서 **배경제거를 눌렀을 때만** 지워진다. 누르지 않았거나 편집이 생기기 전에 올린 것은 배경이 그대로다. 배경을 지운 썸네일은 투명을 담을 수 있는 webp 또는 png 이고, 원본과 확장자가 다를 수 있다.
