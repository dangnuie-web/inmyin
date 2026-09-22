import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BUILT_IN_COUNT, builtInSrc } from "../candidates";
import { Squircle, SquircleDefs } from "../Squircle";

// 시안 하나를 진짜 아이폰 홈 화면에 깔아 보는 페이지.
// 아이폰은 "홈 화면에 추가"를 할 때 그 페이지의 apple-touch-icon 을 아이콘으로 쓴다 —
// 그래서 시안마다 페이지를 하나씩 두고, 각 페이지가 자기 시안을 apple-touch-icon 으로 내건다.
// 홈 화면의 이름은 페이지 제목(title)에서 온다. 진짜 앱과 같아 보이도록 INMYIN 으로 둔다.

export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: BUILT_IN_COUNT }, (_, i) => ({ n: String(i + 1) }));
}

export async function generateMetadata(props: PageProps<"/design/icons/[n]">): Promise<Metadata> {
  const { n } = await props.params;
  return {
    title: "INMYIN",
    robots: { index: false },
    icons: { apple: builtInSrc(Number(n)) },
  };
}

const STEPS = [
  "이 페이지를 아이폰 사파리에서 연다 (카톡 안의 브라우저면 오른쪽 아래 사파리 버튼으로 나간다)",
  "화면 아래 가운데의 공유 버튼(네모에서 화살표가 올라오는 모양)을 누른다",
  "목록을 내려 \"홈 화면에 추가\"를 누른다",
  "이름은 INMYIN 그대로 두고 오른쪽 위 \"추가\"",
  "홈 화면 맨 뒤 페이지에 아이콘이 생긴다. 다 봤으면 길게 눌러 \"북마크 삭제\"",
];

export default async function IconCandidatePage(props: PageProps<"/design/icons/[n]">) {
  const n = Number((await props.params).n);
  if (!Number.isInteger(n) || n < 1 || n > BUILT_IN_COUNT) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10">
      <SquircleDefs />
      <header className="flex flex-col gap-1">
        <Link href="/design/icons" className="text-label text-ink-muted">
          ← 아이콘 미리보기
        </Link>
        <h1 className="text-title font-bold">{n}번 시안을 진짜 홈 화면에 깔아 보기</h1>
      </header>

      <div className="flex flex-col items-center gap-3 rounded-xl bg-linear-to-b from-surface-dark to-ink py-10">
        <Squircle src={builtInSrc(n)} size={120} className="bg-ink" />
        <span className="text-label text-white">INMYIN</span>
      </div>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <li key={i} className="flex gap-3 text-body">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-label font-semibold text-white">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <p className="text-caption text-ink-muted">
        여러 개를 깔면 이름이 다 INMYIN 이라 헷갈릴 수 있어요. 구분하려면 4번에서 이름 뒤에 번호를 붙여도 돼요 (INMYIN {n}).
      </p>
    </main>
  );
}
