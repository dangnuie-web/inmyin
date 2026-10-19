// 랜딩(로그인 전 첫 화면)의 가방 연출에 쓰는 그림과 움직임 값.
// 그림 바꾸기: public/landing/ 에 배경이 투명한 webp(긴 변 400px, 장당 40KB 이하)를 넣고 아래 LANDING_BAG · LANDING_ITEMS 를 고친다.
// 가방을 바꾸면 width · height(그림의 픽셀 크기)와 mouthX · mouthY(입구 자리), 앞 겹 그림(frontSrc)도 새 그림에 맞춘다.
// 아이템은 몇 개든 된다 — 칸은 폰에서 한 줄 4칸, 웹에서 한 줄 8칸까지 놓이고 넘치면 다음 줄로 간다.
// 지금 그림: 당니님이 만든 생성 이미지(오피스 inmyin/생성/)의 흰 배경을 빼고 여백을 잘라 줄인 것.

export type LandingPicture = {
  src: string;
  // 화면 읽기 프로그램이 읽는 이름
  alt: string;
};

export type LandingBag = LandingPicture & {
  // 그림의 픽셀 크기 — 가방 자리의 가로세로 비율로 쓴다
  width: number;
  height: number;
  // 아이템이 나오는 자리(그림 왼쪽 · 위에서부터의 비율). 열린 입구 안 안감 위, 앞 지퍼 입술 조금 위라 아이템 아랫부분이 입술 뒤에 가려진 채 솟아오른다
  mouthX: number;
  mouthY: number;
  // 앞 겹 그림 — 같은 크기의 가방 그림에서 앞 지퍼 입술 아래(앞벽 · 앞 손잡이)만 남긴 것. 아이템 위에 덮어 "안에서 나오는" 느낌을 낸다
  frontSrc: string;
};

// 가방 — 아이템이 튀어나오는 곳 (위에서 내려다본 열린 검정 토트백)
export const LANDING_BAG: LandingBag = {
  src: "/landing/bag.webp",
  frontSrc: "/landing/bag-front.webp",
  alt: "열린 가죽 가방",
  width: 309,
  height: 400,
  mouthX: 0.45,
  mouthY: 0.46,
};

// 가방에서 나와 칸에 꽂히는 아이템들. 이 순서대로 튀어나와 왼쪽 칸부터 채운다.
// 마지막 아이템이 한 바퀴의 끝맺음이라, 잘 안 보이는 투명 향수는 끝에 두지 않고 눈에 띄는 코발트 수첩으로 맺는다
export const LANDING_ITEMS: LandingPicture[] = [
  { src: "/landing/camera.webp", alt: "분홍 카메라" },
  { src: "/landing/lipstick.webp", alt: "빨간 립스틱" },
  { src: "/landing/airpods-case.webp", alt: "민트색 에어팟 케이스" },
  { src: "/landing/sunglasses.webp", alt: "호피 무늬 선글라스" },
  { src: "/landing/hair-claw.webp", alt: "보라색 집게핀" },
  { src: "/landing/perfume.webp", alt: "투명한 유리 향수병" },
  { src: "/landing/card-wallet.webp", alt: "노란 카드지갑" },
  { src: "/landing/notebook.webp", alt: "코발트색 하드커버 수첩" },
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
