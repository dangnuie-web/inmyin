"use client";

import Link from "next/link";
import { useState } from "react";
import { TERMS, termFieldName, type TermId } from "@/lib/terms";

const BOX =
  "size-5 shrink-0 appearance-none border border-ink bg-white checked:bg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-point";

// 모든 항목을 같은 값으로 채운다
function fill(value: boolean) {
  return Object.fromEntries(TERMS.map((term) => [term.id, value])) as Record<TermId, boolean>;
}

// 약관 동의 묶음. "모두 동의합니다"를 누르면 아래 항목이 한꺼번에 바뀐다.
// onChange 로 필수 항목을 다 채웠는지 알려준다.
export function TermsAgreement({ onChange }: { onChange?: (requiredDone: boolean) => void }) {
  const [checked, setChecked] = useState(() => fill(false));

  function update(next: Record<TermId, boolean>) {
    setChecked(next);
    onChange?.(TERMS.every((term) => !term.required || next[term.id]));
  }

  const allChecked = TERMS.every((term) => checked[term.id]);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">약관 동의</legend>
      <label className="flex items-center gap-4 text-body font-semibold">
        <input
          type="checkbox"
          className={BOX}
          checked={allChecked}
          onChange={(e) => update(fill(e.target.checked))}
        />
        모두 동의합니다
      </label>
      {TERMS.map((term) => (
        <label key={term.id} className="flex items-center gap-4 text-caption text-ink-muted">
          <input
            type="checkbox"
            name={termFieldName(term.id)}
            className={BOX}
            checked={checked[term.id]}
            onChange={(e) => update({ ...checked, [term.id]: e.target.checked })}
          />
          [{term.required ? "필수" : "선택"}] {term.label}
          {"href" in term && (
            <Link href={term.href} target="_blank" className="ml-auto shrink-0 underline underline-offset-2">
              보기
            </Link>
          )}
        </label>
      ))}
    </fieldset>
  );
}
