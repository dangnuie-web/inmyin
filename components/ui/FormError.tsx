// 폼 아래에 뜨는 빨간 오류 한 줄. 내용이 없으면 아무것도 그리지 않는다.
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-caption text-primary">
      {message}
    </p>
  );
}
