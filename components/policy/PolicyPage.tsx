import { BackHeader } from "@/components/ui/BackHeader";
import { formatShortDate } from "@/lib/item/rules";
import type { Policy } from "@/lib/policies";

// 이용약관 · 개인정보처리방침 화면 (/terms, /privacy). 로그인 없이 열린다 — 가입 화면에서 읽어야 하므로.
// 글은 lib/policies.ts 에 있다
export function PolicyPage({ policy }: { policy: Policy }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col pb-16">
      <BackHeader title={policy.title} />
      <div className="flex flex-col gap-8 px-5 pt-4">
        <p className="break-keep text-caption text-ink-muted">마지막으로 고친 날 {formatShortDate(policy.updatedAt)}</p>
        <p className="break-keep text-body leading-relaxed">{policy.intro}</p>
        {policy.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="text-link font-bold">{section.heading}</h2>
            {groupLines(section.body).map((block, i) =>
              typeof block === "string" ? (
                <p key={i} className="break-keep text-body leading-relaxed">
                  {block}
                </p>
              ) : (
                <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 text-body leading-relaxed">
                  {block.map((item) => (
                    <li key={item} className="break-keep">
                      {item}
                    </li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </div>
    </main>
  );
}

// "- " 로 시작하는 줄들은 이어진 만큼 한 목록으로 묶는다
function groupLines(lines: string[]) {
  const blocks: (string | string[])[] = [];
  for (const line of lines) {
    if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (Array.isArray(last)) last.push(line.slice(2));
      else blocks.push([line.slice(2)]);
    } else {
      blocks.push(line);
    }
  }
  return blocks;
}
