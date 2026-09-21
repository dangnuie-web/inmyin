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
| `Inventory` | id, userId, name, categories, imageUrl, rawImageUrl, slotCount, parentInventoryId, parentSlotIndex, order, createdAt, deletedAt | categories = 유저가 정한 태그 목록. 사진은 필수다 — 만들기가 항상 사진 고르기로 시작한다 |
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
4. **`slotIndex` 는 자리 번호가 아니라 순서 번호다.** 화면은 `slotIndex` 순으로 빈틈 없이 줄 세워 그린다 — 그래서 중간 것을 지우면 뒤의 것들이 저절로 한 칸씩 당겨 붙는다. 새 아이템은 가장 큰 번호 + 1 을 받는다. 꽉 찼는지는 번호가 아니라 **든 것의 개수**(아이템 수 + 담긴 인벤토리 수)를 `slotCount` 와 비교해 판단한다. `slotCount`는 플랜 상수에서 온다. (처음 만든 DB 트리거는 `slotIndex < slotCount` 를 검사한다 — 아이템 등록을 만들 때 개수 기준으로 바꾼다)
5. **삭제는 `deletedAt` 기록.** 물리 삭제 금지 — 과거 INMYIN 게시물이 아이템을 참조한다
6. **`likeCount`는 캐시.** 정확한 순위 집계는 `Like.createdAt` 기준으로 따로 한다

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
| 인벤토리 썸네일 | `inventories` | 목록과 부모 격자의 칸에 표시. 편집(M-07)이 생기기 전에 올린 것은 배경이 그대로다 |
| 인벤토리 원본 | `inventories-raw` | 아이템 원본과 같은 방식 |
| INMYIN 최종 이미지 | `posts` | 피드 노출용 |

원본을 보관하는 이유는 배경제거 모델이 나아졌을 때 다시 따낼 수 있어야 하기 때문이다.
