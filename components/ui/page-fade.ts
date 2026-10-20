// 화면 전환 페이드의 이름표 — <Link transitionTypes={PAGE_FADE}>. 이걸 단 Link 로 옮길 때만 몸통이 페이드로 바뀐다
// (components/ui/PageTransition.tsx). 서버 컴포넌트(ProfileShell 등)도 쓰므로 "use client" 파일과 따로 둔다
export const PAGE_FADE = ["page-fade"];
