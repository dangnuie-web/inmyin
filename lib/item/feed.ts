import type { CollectedItem } from "./queries";

// Home 피드(H-01)의 타입과 상수. 브라우저에서 도는 ItemFeed 도 쓰므로 서버 전용 파일(queries.ts)과 떼어 둔다

// 피드의 한 칸. 누구 것인지도 같이 가진다
export type FeedItem = CollectedItem & {
  ownerHandle: string;
  ownerNickname: string;
  // "2026-09-22T…". 다음 장을 읽을 때 "이것보다 오래된 것"의 기준
  createdAt: string;
};

export const FEED_PAGE_SIZE = 60;

export type FeedFilter = {
  // 이름에서 찾는다
  q?: string;
  category?: string;
  // 이 시각보다 오래된 것부터 (다음 장)
  before?: string;
};
