// 랜딩(로그인 전 첫 화면)의 가방 연출에 쓰는 그림과 움직임 값.
// 그림 바꾸기: public/landing/ 에 배경이 투명한 webp(긴 변 400~600px)를 넣고 아래 LANDING_BAG · LANDING_ITEMS 의 src 만 고친다.
// 아이템은 몇 개든 된다(지금 3개 → 8개로 늘려도 그대로) — 칸은 폰에서 한 줄 4칸, 웹에서 한 줄 8칸까지 놓이고 넘치면 다음 줄로 간다.

export type LandingPicture = {
  src: string;
  // 화면 읽기 프로그램이 읽는 이름
  alt: string;
};

// 가방 — 아이템이 튀어나오는 곳
export const LANDING_BAG: LandingPicture = { src: "/landing/bag.webp", alt: "가죽 가방" };

// 가방에서 나와 칸에 꽂히는 아이템들. 이 순서대로 튀어나와 왼쪽 칸부터 채운다
export const LANDING_ITEMS: LandingPicture[] = [
  { src: "/landing/camera.webp", alt: "분홍 카메라" },
  { src: "/landing/pouch.webp", alt: "깅엄 체크 파우치" },
  { src: "/landing/airpods-case.webp", alt: "에어팟 케이스" },
];

// 한 줄에 놓는 칸 수의 상한 — 폰 · 웹(1024px 이상)
export const LANDING_COLUMNS = { phone: 4, web: 8 } as const;

// 움직임 값 (임시 — 디자인이 정해지면 숫자만 바꾼다). 시간은 ms, 거리는 px
export const LANDING_MOTION = {
  // 화면이 뜨고 첫 아이템이 나오기까지
  startDelay: 500,
  // 아이템 하나가 가방에서 칸까지 날아가는 시간
  flight: 760,
  // 다음 아이템이 나오기까지의 간격
  stagger: 220,
  // 칸보다 이만큼 더 높이 솟았다가 내려앉는다 (포물선의 꼭대기)
  arcHeight: 70,
  // 가방 안에서 나올 때의 크기 (1 = 칸 크기)
  startScale: 0.35,
  // 칸에 닿을 때 납작해졌다가(squash) 튕겨 오르는 정도와 시간
  squash: 0.14,
  bounce: 260,
  // 아이템이 나갈 때마다 가방이 들썩이는 정도와 시간
  bagHop: 0.06,
  bagHopTime: 240,
  // 다 꽂힌 뒤 멈춰 있는 시간 → 사라졌다가 처음부터 다시
  repeat: true,
  hold: 2800,
  fadeOut: 360,
  restGap: 500,
} as const;
