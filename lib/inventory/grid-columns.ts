import { cookies } from "next/headers";
import { DEFAULT_GRID_COLUMNS, GRID_COLUMN_CHOICES, GRID_COLUMNS_COOKIE, type GridColumns } from "@/components/inventory/Slot";

// 격자 한 줄의 칸 수를 쿠키에서 읽는다 (서버). 3 · 4 · 5 를 견줘 보는 동안만 쓰는 임시 장치 —
// 쿠키라서 첫 화면부터 그 값으로 그려지고(깜빡임 없음), 어느 화면의 격자든 같은 값을 쓴다
export async function getGridColumns(): Promise<GridColumns> {
  const value = Number((await cookies()).get(GRID_COLUMNS_COOKIE)?.value);
  return GRID_COLUMN_CHOICES.includes(value as GridColumns) ? (value as GridColumns) : DEFAULT_GRID_COLUMNS;
}
