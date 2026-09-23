import { Dancing_Script, Do_Hyeon, Gaegu, Gowun_Batang, Great_Vibes, Jua, Nanum_Pen_Script, Pacifico } from "next/font/google";

// 에디터 텍스트의 글꼴. 전부 구글 폰트의 SIL OFL 1.1 — 상업적으로 써도 된다.
// next/font 가 빌드 때 받아서 우리 서버에서 내보내므로 사용자의 폰이 구글에 접속하지 않고, 어느 기기에서나 같은 글꼴로 그려진다.
// preload: false — 에디터에서만 쓰는 글꼴이라 다른 화면에서 미리 받지 않는다. 캔버스에 그리기 전에 document.fonts.load 로 불러 둔다
// (next/font 는 빌드 때 이 호출을 읽어서 글꼴을 받으므로, 옵션은 변수로 묶지 못하고 하나하나 글자 그대로 적어야 한다)
const jua = Jua({ weight: "400", subsets: ["latin"], display: "swap", preload: false });
const doHyeon = Do_Hyeon({ weight: "400", subsets: ["latin"], display: "swap", preload: false });
const nanumPen = Nanum_Pen_Script({ weight: "400", subsets: ["latin"], display: "swap", preload: false });
const gaegu = Gaegu({ weight: "400", subsets: ["latin"], display: "swap", preload: false });
const gowunBatang = Gowun_Batang({ weight: "400", subsets: ["latin"], display: "swap", preload: false });
const dancingScript = Dancing_Script({ weight: "700", subsets: ["latin"], display: "swap", preload: false });
const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"], display: "swap", preload: false });
const pacifico = Pacifico({ weight: "400", subsets: ["latin"], display: "swap", preload: false });

export type TextFontId = (typeof TEXT_FONTS)[number]["id"];

// family — 캔버스(Konva)에 주는 글꼴 이름. className — 판의 글꼴 칩과 미리보기에 입힌다
export const TEXT_FONTS = [
  { id: "pretendard", label: "기본", family: "Pretendard Variable, Pretendard, sans-serif", className: "" },
  { id: "jua", label: "주아", family: jua.style.fontFamily, className: jua.className },
  { id: "dohyeon", label: "도현", family: doHyeon.style.fontFamily, className: doHyeon.className },
  { id: "nanumpen", label: "나눔손글씨", family: nanumPen.style.fontFamily, className: nanumPen.className },
  { id: "gaegu", label: "개구", family: gaegu.style.fontFamily, className: gaegu.className },
  { id: "gowunbatang", label: "고운바탕", family: gowunBatang.style.fontFamily, className: gowunBatang.className },
  { id: "dancing", label: "Dancing", family: dancingScript.style.fontFamily, className: dancingScript.className },
  { id: "greatvibes", label: "Great Vibes", family: greatVibes.style.fontFamily, className: greatVibes.className },
  { id: "pacifico", label: "Pacifico", family: pacifico.style.fontFamily, className: pacifico.className },
] as const;

export function textFont(id: string) {
  return TEXT_FONTS.find((font) => font.id === id) ?? TEXT_FONTS[0];
}

// 글꼴 파일이 다 불려야 캔버스에 제대로 그려진다 (안 그러면 기본 글꼴로 찍힌다). 이 글자들에 필요한 조각만 받는다
export function loadTextFont(id: string, text: string, bold: boolean) {
  if (typeof document === "undefined" || !("fonts" in document)) return Promise.resolve();
  const { family } = textFont(id);
  return document.fonts.load(`${bold ? "bold" : "normal"} 40px ${family}`, text).then(() => undefined);
}
