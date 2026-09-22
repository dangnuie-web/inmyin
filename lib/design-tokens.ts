import { readFileSync } from "node:fs";
import { join } from "node:path";

// app/globals.css 의 @theme 값을 읽는다. 서버(빌드)에서만 쓴다.
// CSS 를 못 읽는 곳 — 매니페스트(app/manifest.ts), theme-color 메타 태그 — 에 같은 값을 넣기 위한 것.
// 값(hex)을 코드에 따로 적으면 피그마 토큰과 어긋나므로 (CLAUDE.md) 여기서 읽어 온다
export function readTokens() {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const tokens: Record<string, string> = {};
  for (const [, name, value] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[name] = value.trim().replace(/\s+/g, " ");
  }
  return tokens;
}

// var(--color-gray-1) 처럼 다른 토큰을 가리키면 그 이름을 돌려준다
export function aliasOf(value: string) {
  return value.match(/^var\(--color-([\w-]+)\)$/)?.[1];
}

// 색 토큰 이름 → hex. 역할 이름(surface 등)이면 가리키는 팔레트 색까지 따라간다
export function colorToken(name: string, tokens = readTokens()) {
  const value = tokens[`color-${name}`];
  if (!value) throw new Error(`색 토큰이 없습니다: ${name}`);
  const alias = aliasOf(value);
  return alias ? tokens[`color-${alias}`] : value;
}
