import { WebNav } from "@/components/ui/WebNav";

// 하단 탭이 없는 화면들(상세 · 목록 · 입력 · 설정). 웹에서는 상단 메뉴가 그대로 있다
export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebNav />
      {children}
    </>
  );
}
