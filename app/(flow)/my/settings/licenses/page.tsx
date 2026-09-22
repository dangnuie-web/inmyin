import type { Metadata } from "next";
import { HeaderMini } from "@/components/ui/HeaderMini";
import { OPEN_SOURCE_LICENSES, SOURCE_URL } from "@/lib/licenses";

export const metadata: Metadata = { title: "오픈소스 라이선스 · INMYIN" };

// 설정 › 오픈소스 라이선스. 이 앱이 가져다 쓰는 오픈소스와 그 라이선스
export default function LicensesPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <HeaderMini icon="back" href="/my/settings" title="오픈소스 라이선스" />
      <p className="break-keep px-5 pt-4 text-label text-ink-muted">INMYIN 은 아래의 오픈소스로 만들어졌습니다. 이름을 누르면 원본 저장소가 열립니다.</p>
      {/* AGPL 은 서비스를 쓰는 사람에게 소스코드를 받을 길을 열어 두라고 한다 (13조). 여기가 그 길이다 */}
      <a
        href={SOURCE_URL}
        target="_blank"
        rel="noreferrer"
        className="mx-5 mt-4 flex h-12 items-center justify-between gap-4 rounded-md bg-surface px-4 text-body active:opacity-60"
      >
        <span className="min-w-0 truncate">INMYIN 소스코드</span>
        <span className="shrink-0 text-caption text-ink-muted">AGPL-3.0</span>
      </a>
      <ul className="mt-2 flex flex-col px-5 pb-10">
        {OPEN_SOURCE_LICENSES.map(({ name, license, url }) => (
          <li key={name}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-between gap-4 border-b border-gray-3 text-body active:opacity-60"
            >
              <span className="min-w-0 truncate">{name}</span>
              <span className="shrink-0 text-caption text-ink-muted">{license}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
