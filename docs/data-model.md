# 데이터 모델

테이블 6개 + 연결 테이블 1개로 전체 기능이 돌아간다.

```
User ──< Inventory ──< Item
 │           └──< Inventory (중첩)
 ├──< InmyinPost ──< PostItem >── Item
 ├──< Like
 ├──< Follow
 └──< Block
```

## 테이블

| 테이블 | 주요 필드 | 메모 |
| --- | --- | --- |
| `User` | id, handle, nickname, avatarUrl, bio, plan, provider, createdAt, deletedAt | plan = `basic` \| `premium` |
| `Inventory` | id, userId, kind, name, slotCount, parentInventoryId, parentSlotIndex, order, createdAt, deletedAt | kind = `closet` \| `fridge` \| `home` \| `supplies` \| `custom` |
| `Item` | id, userId, inventoryId, slotIndex, category, imageUrl, rawImageUrl, name, description, quantity, isPublic, acquiredAt, expiresAt, likeCount, createdAt, deletedAt | rawImageUrl = 배경제거 전 원본 |
| `InmyinPost` | id, userId, imageUrl, canvasJson, likeCount, createdAt, deletedAt | |
| `PostItem` | postId, itemId, x, y, w, h | 게시물 ↔ 아이템 탭 영역 |
| `Like` | userId, targetType, targetId, createdAt | targetType = `item` \| `post` |
| `Follow` | followerId, followingId, createdAt | |
| `Block` | blockerId, blockedId, createdAt | 2단계 |

## 불변 규칙

1. **부모는 항상 하나다.** `Item.inventoryId` 와 `Inventory.parentInventoryId` 모두 단일 값. 이동은 이 값을 바꾸는 것이고, 복사는 존재하지 않는다. 짐싸기는 `inventoryId` + `slotIndex` 한 줄 업데이트로 끝난다
2. **한 칸에 하나.** `(inventoryId, slotIndex)` 에 unique 제약. 아이템과 중첩 인벤토리가 같은 칸을 쓴다
3. **이미 부모가 있는 인벤토리는 다른 곳에 담을 수 없다.** `parentInventoryId IS NULL` 인 것만 담기 대상. 한 줄로 이어지는 중첩은 **5겹까지**이고, 자기 자신이나 자기 안에 든 인벤토리 속으로 들어가는 순환은 DB 트리거가 막는다
4. **`slotIndex < slotCount`.** `slotCount`는 플랜 상수에서 온다
5. **삭제는 `deletedAt` 기록.** 물리 삭제 금지 — 과거 INMYIN 게시물이 아이템을 참조한다
6. **`likeCount`는 캐시.** 정확한 순위 집계는 `Like.createdAt` 기준으로 따로 한다

## 카테고리는 DB에 없다

유저가 만들지 않으므로 테이블로 두지 않는다. `lib/categories.ts` 상수에서 `Inventory.kind` 로 찾아 쓴다.

```ts
export const CATEGORIES = {
  closet:   ['상의', '하의', '신발', '모자', '가방'],
  fridge:   ['고기', '야채', '반찬', '냉동', '조미료'],
  home:     ['거실', '침실', '화장실'],
  supplies: ['청소', '세탁', '소모품'],
  custom:   [],
} as const
```

`Item.category` 는 이 값 중 하나를 담는 문자열. `custom` 인벤토리의 아이템은 `null`.

## 플랜 한도도 DB에 없다

```ts
export const PLANS = {
  basic:   { maxInventories: 5,  slotCount: 25 },
  premium: { maxInventories: 20, slotCount: 50 },
} as const
```

## 순위 쿼리

`lib/ranking.ts`.

```sql
-- 인기: 최근 24시간
SELECT target_id, count(*) AS score
FROM "Like"
WHERE target_type = 'post' AND created_at > now() - interval '24 hours'
GROUP BY target_id ORDER BY score DESC;

-- 추천: 누적 좋아요 100 미만 유저 중, 최근 1시간
```

`RECOMMEND_THRESHOLD = 100` 을 상수로 둔다.

## 비공개 아이템 읽기

저장은 칸 번호 그대로. 남의 프로필에서 읽을 때만 `isPublic = true` 인 것을 모아 인덱스를 다시 매긴다. 내 화면에서는 원래 칸 위치 그대로 보인다.

## 이미지 저장

| 용도 | 버킷 | 비고 |
| --- | --- | --- |
| 아이템 썸네일 (배경 제거됨) | `items` | 격자에 표시 |
| 아이템 원본 | `items-raw` | 장변 1280px로 줄여 보관 |
| INMYIN 최종 이미지 | `posts` | 피드 노출용 |

원본을 보관하는 이유는 배경제거 모델이 나아졌을 때 다시 따낼 수 있어야 하기 때문이다.
