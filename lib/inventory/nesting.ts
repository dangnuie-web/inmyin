import type { InventorySummary } from "./queries";

// 한 줄로 이어지는 중첩 한도 (예: 집 › 방 › 가방 › 작은 가방 › 파우치). DB 의 check_inventory_nesting 과 같아야 한다
export const MAX_NESTING_DEPTH = 5;

type Nestable = Pick<InventorySummary, "id" | "name" | "parentId">;

// 이 인벤토리를 그 인벤토리 안에 담을 수 없는 이유. 담을 수 있으면 null.
// 화면에서 미리 걸러 보여주기 위한 것이고, 최종 판단은 DB 트리거가 한다
export function nestingBlocker(candidate: Nestable, into: Nestable, all: Nestable[]): string | null {
  const byId = new Map(all.map((inventory) => [inventory.id, inventory]));

  // 인벤토리도 실제 물건이라 부모는 항상 하나다 (CLAUDE.md 규칙 2)
  if (candidate.parentId === into.id) return "이미 여기에 들어 있어요";
  if (candidate.parentId) return `${byId.get(candidate.parentId)?.name ?? "다른 인벤토리"} 안에 들어 있어요`;

  // into 에서 위로 올라가는 줄. 그 길에 candidate 가 있으면 자기 안에 든 것 속으로 들어가려는 것이다
  const chain: string[] = [];
  for (let at: Nestable | undefined = into; at && chain.length <= MAX_NESTING_DEPTH; at = at.parentId ? byId.get(at.parentId) : undefined) {
    if (at.id === candidate.id) return "이 인벤토리를 담고 있어요";
    chain.push(at.id);
  }

  // candidate 아래로 몇 겹을 달고 있는지
  const depthBelow = (id: string, level = 0): number =>
    level > MAX_NESTING_DEPTH
      ? level
      : Math.max(0, ...all.filter((child) => child.parentId === id).map((child) => 1 + depthBelow(child.id, level + 1)));

  if (chain.length + 1 + depthBelow(candidate.id) > MAX_NESTING_DEPTH) return `${MAX_NESTING_DEPTH}겹까지만 겹쳐 담을 수 있어요`;
  return null;
}
