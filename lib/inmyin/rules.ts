// 포스팅(M-11)의 글자 규칙. 서버와 브라우저 양쪽에서 부른다 (DB 제약과 같아야 한다)
export const POST_TITLE_MAX = 40;
export const POST_DESCRIPTION_MAX = 500;

// 게시물 ↔ 아이템 탭 영역. 캔버스 크기에 대한 비율(0~1)로 적어 어느 크기로 보여줘도 같은 자리
export type PostItemArea = { itemId: string; x: number; y: number; w: number; h: number };
