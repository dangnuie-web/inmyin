"use client";

import { useEffect, useRef } from "react";

// 방금 고르거나 찍은 파일을 브라우저 안에서 바로 보여준다. 부모가 relative 여야 한다 — 부모를 가득 채운다.
// 파일에 임시 주소를 붙여 img 에 꽂고, 다 쓰면 주소를 돌려준다 — 안 돌려주면 메모리가 샌다
export function PhotoPreview({ file, className = "" }: { file: File; className?: string }) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // 서버를 거치지 않는 임시 주소라 Next 의 Image 를 쓸 수 없다
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imageRef} alt="" className={`absolute inset-0 size-full object-cover ${className}`} />;
}
