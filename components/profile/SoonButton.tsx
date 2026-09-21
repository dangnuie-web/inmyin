"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Toast } from "@/components/ui/Toast";

type SoonButtonProps = {
  // 눌렀을 때 아래에 잠깐 뜨는 안내. 예: "프로필 공유는 곧 만들어요."
  notice: string;
  className?: string;
  children: ReactNode;
};

// 아직 만들지 않은 기능의 자리. 생김새는 다 갖추고, 누르면 "곧 만들어요"만 알려준다 —
// 버튼을 아예 빼 두면 화면이 디자인과 달라지고, 눌러도 아무 일이 없으면 고장난 줄 안다
export function SoonButton({ notice, className, children }: SoonButtonProps) {
  const [shown, setShown] = useState(false);
  const hide = useCallback(() => setShown(false), []);

  return (
    <>
      <button type="button" onClick={() => setShown(true)} className={className}>
        {children}
      </button>
      <Toast message={shown ? notice : null} onDone={hide} />
    </>
  );
}
