// A-01 ~ A-03 공통 틀. 하단 탭 없이 가운데 한 줄로 쌓는다.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-8 pb-10 pt-20">{children}</main>
  );
}
