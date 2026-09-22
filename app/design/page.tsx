import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "디자인 토큰 · INMYIN",
  robots: { index: false },
};

// 토큰 확인용 페이지. 값(hex, px)은 여기에 적지 않고 app/globals.css 에서 읽어온다.
// className 은 Tailwind가 찾을 수 있게 글자 그대로 적어둔다.

const PALETTE = [
  { name: "white", className: "bg-white" },
  { name: "gray-1", className: "bg-gray-1" },
  { name: "gray-2", className: "bg-gray-2" },
  { name: "gray-3", className: "bg-gray-3" },
  { name: "gray-4", className: "bg-gray-4" },
  { name: "gray-mid", className: "bg-gray-mid" },
  { name: "ink", className: "bg-ink" },
  { name: "primary", className: "bg-primary" },
  { name: "point", className: "bg-point" },
  { name: "dropdown", className: "bg-dropdown" },
  { name: "surface-dark", className: "bg-surface-dark" },
  { name: "field-dark", className: "bg-field-dark" },
  { name: "placeholder-dark", className: "bg-placeholder-dark" },
  { name: "kakao", className: "bg-kakao" },
];

const ROLES = [
  { name: "surface", className: "bg-surface" },
  { name: "border", className: "bg-border" },
  { name: "disabled", className: "bg-disabled" },
  { name: "ink-muted", className: "bg-ink-muted" },
];

const TEXTS = [
  { name: "title", className: "text-title" },
  { name: "link", className: "text-link" },
  { name: "body", className: "text-body" },
  { name: "label", className: "text-label" },
  { name: "caption", className: "text-caption" },
];

const WEIGHTS = [
  { name: "400", className: "font-normal" },
  { name: "500", className: "font-medium" },
  { name: "600", className: "font-semibold" },
  { name: "700", className: "font-bold" },
];

const RADII = [
  { name: "sm", className: "rounded-sm" },
  { name: "md", className: "rounded-md" },
  { name: "lg", className: "rounded-lg" },
  { name: "xl", className: "rounded-xl" },
  { name: "full", className: "rounded-full" },
];

function readTokens() {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const tokens: Record<string, string> = {};
  for (const [, name, value] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim().replace(/\s+/g, " ");
  }
  return tokens;
}

// var(--color-gray-1) 처럼 다른 토큰을 가리키면 그 이름을 돌려준다
function aliasOf(value: string) {
  return value.match(/^var\(--color-([\w-]+)\)$/)?.[1];
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-title font-bold">{title}</h2>
        {note && <p className="text-caption text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function ColorChip({ name, className, tokens }: { name: string; className: string; tokens: Record<string, string> }) {
  const value = tokens[`color-${name}`];
  const alias = aliasOf(value);
  const hex = alias ? tokens[`color-${alias}`] : value;

  return (
    <li className="flex flex-col gap-2">
      {/* 반투명 색이 티가 나도록 체크무늬를 깐다 */}
      <div
        className="overflow-hidden rounded-md border border-border"
        style={{
          background:
            "repeating-conic-gradient(var(--color-gray-3) 0% 25%, var(--color-white) 0% 50%) 0 0 / 16px 16px",
        }}
      >
        <div className={`h-20 ${className}`} />
      </div>
      <div className="flex flex-col">
        <span className="text-label font-semibold">{name}</span>
        <span className="text-caption text-ink-muted">
          {alias ? `→ ${alias} · ${hex}` : hex}
        </span>
        <code className="text-caption text-ink-muted">{className}</code>
      </div>
    </li>
  );
}

export default function DesignPage() {
  const tokens = readTokens();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-5 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-title font-bold">INMYIN 디자인 토큰</h1>
        <p className="text-label text-ink-muted">
          app/globals.css 의 @theme 값을 그대로 읽어 보여주는 확인용 페이지
        </p>
        <Link href="/design/icons" className="text-label text-point underline">
          앱 아이콘 미리보기 →
        </Link>
      </header>

      <Section title="색 — 팔레트" note="피그마 변수 그대로">
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {PALETTE.map((c) => (
            <ColorChip key={c.name} {...c} tokens={tokens} />
          ))}
        </ul>
      </Section>

      <Section title="색 — 역할 이름" note="값은 팔레트와 같고 쓰임새만 드러낸다">
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {ROLES.map((c) => (
            <ColorChip key={c.name} {...c} tokens={tokens} />
          ))}
        </ul>
      </Section>

      <Section title="글자" note={tokens["font-sans"]}>
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {TEXTS.map((t) => (
            <li key={t.name} className="flex flex-col gap-2 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-label font-semibold">{t.name}</span>
                <code className="text-caption text-ink-muted">
                  {t.className} · {tokens[`text-${t.name}`]} / {tokens[`text-${t.name}--line-height`]}
                </code>
              </div>
              <p className={t.className}>
                내가 가진 것을 사진으로 찍어 가상의 창고에 넣어두고, 한눈에 보고 남에게 보여주는 앱.
                INMYIN Inventory 0123456789
              </p>
            </li>
          ))}
        </ul>

        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {WEIGHTS.map((w) => (
            <li key={w.name} className="flex flex-col gap-1 rounded-md border border-border p-4">
              <span className={`text-title ${w.className}`}>인벤토리 Aa</span>
              <code className="text-caption text-ink-muted">
                {w.className} · {w.name}
              </code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="모서리">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {RADII.map((r) => (
            <li key={r.name} className="flex flex-col gap-2">
              <div className={`h-20 border border-disabled bg-gray-2 ${r.className}`} />
              <div className="flex flex-col">
                <span className="text-label font-semibold">{r.name}</span>
                <code className="text-caption text-ink-muted">
                  {r.className} · {tokens[`radius-${r.name}`]}
                </code>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
