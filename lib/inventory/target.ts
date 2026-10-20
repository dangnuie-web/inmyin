// 아이템을 넣을 인벤토리의 기본값 고르기 (무늬 인벤토리고르기설계 v01 3절). 서버(/add · 정보 입력 M-08)가 쓴다.
// DB 를 읽지 않는 순수 함수라 시험(target.test.mjs)이 그대로 부른다.
//
// 우선순위: 인벤토리 안(preferredId) > 카테고리 칩 > 마지막 쓴 것(쿠키) > 최근에 아이템을 넣은 곳 > 최근 만든 곳.
// 모든 단계에서 꽉 찬 인벤토리는 건너뛴다.

export type TargetCandidate = {
  id: string;
  usedSlots: number;
  slotCount: number;
  // 만든 때 (ISO 문자열). "최근 만든 곳"에 쓴다
  createdAt: string;
};

// 내 아이템 하나가 어디에 · 언제 · 무슨 카테고리로 들어갔나. 지운 것은 빼고 준다
export type ItemStamp = {
  inventoryId: string;
  category: string | null;
  createdAt: string;
};

export type TargetInput = {
  inventories: TargetCandidate[];
  items: ItemStamp[];
  // 인벤토리 상세의 + 처럼 "여기"가 정해져 있을 때
  preferredId?: string | null;
  // 아이템 모아보기(M-13)에서 칩을 고른 채 + 를 눌렀을 때
  category?: string | null;
  // 쿠키 inmyin-last-inventory (마지막에 연 인벤토리)
  rememberedId?: string | null;
};

export function hasRoom(inventory: Pick<TargetCandidate, "usedSlots" | "slotCount">) {
  return inventory.usedSlots < inventory.slotCount;
}

// 최근 것부터. 같은 때면 원래 순서 그대로
function newestFirst<T extends { createdAt: string }>(list: T[]) {
  return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

// 그 카테고리 아이템이 가장 많은 인벤토리부터. 같으면 그 카테고리 아이템을 가장 최근에 넣은 곳이 앞
export function inventoriesByCategory(items: ItemStamp[], category: string): string[] {
  const tally = new Map<string, { count: number; latest: string }>();
  for (const item of items) {
    if (item.category !== category) continue;
    const seen = tally.get(item.inventoryId);
    if (!seen) tally.set(item.inventoryId, { count: 1, latest: item.createdAt });
    else {
      seen.count += 1;
      if (item.createdAt > seen.latest) seen.latest = item.createdAt;
    }
  }
  return [...tally.entries()]
    .sort(([, a], [, b]) => b.count - a.count || (a.latest < b.latest ? 1 : a.latest > b.latest ? -1 : 0))
    .map(([id]) => id);
}

// 빈 칸 있는 인벤토리 중 기본으로 골라 둘 곳의 id. 빈 칸 있는 곳이 하나도 없으면 null
export function chooseTarget({ inventories, items, preferredId, category, rememberedId }: TargetInput): string | null {
  const byId = new Map(inventories.map((inventory) => [inventory.id, inventory]));
  const open = (id: string | null | undefined) => {
    const inventory = id ? byId.get(id) : undefined;
    return inventory && hasRoom(inventory) ? inventory.id : null;
  };

  const preferred = open(preferredId);
  if (preferred) return preferred;

  if (category) {
    for (const id of inventoriesByCategory(items, category)) {
      if (open(id)) return id;
    }
  }

  const remembered = open(rememberedId);
  if (remembered) return remembered;

  for (const item of newestFirst(items)) {
    if (open(item.inventoryId)) return item.inventoryId;
  }

  return newestFirst(inventories).find(hasRoom)?.id ?? null;
}

// 모두 꽉 찼을 때 데려갈 인벤토리 (거기에 "칸이 가득 찼어요 · 프리미엄으로 늘리기"가 있다).
// 쿠키 → 최근에 아이템을 넣은 곳 → 최근 만든 곳. 인벤토리가 없으면 null
export function fallbackInventory({ inventories, items, rememberedId }: Pick<TargetInput, "inventories" | "items" | "rememberedId">): string | null {
  const ids = new Set(inventories.map((inventory) => inventory.id));
  if (rememberedId && ids.has(rememberedId)) return rememberedId;
  const recent = newestFirst(items).find((item) => ids.has(item.inventoryId));
  if (recent) return recent.inventoryId;
  return newestFirst(inventories)[0]?.id ?? null;
}
