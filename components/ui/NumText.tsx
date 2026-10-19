// 글 속의 숫자(1,284 · 5/25 · 26.09.05)만 num(500 · 고정폭 숫자, globals.css)으로 감싼다.
// 숫자만 따로 감싸므로 둘레 글자의 굵기(제목 줄 · 알약의 font-bold 등)와 겹치지 않는다
export function NumText({ text }: { text: string | number }) {
  const parts = String(text).split(/(\d(?:[\d,./:]*\d)?)/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="num">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
