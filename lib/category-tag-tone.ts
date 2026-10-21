// 거르는 칩(CategoryTag 의 글자 칩) 글자색. 밝은 화면 / 어두운 화면(bg-surface-dark — 정보 입력 · 수정).
// 흑백 규칙 — 색이 아니라 밝기 · 굵기로 고름을 가른다. 시험: lib/category-tag-tone.test.mjs (바탕과의 명암비)
export const CATEGORY_TAG_TEXT_TONES = {
  light: { selected: "font-bold text-ink", plain: "font-medium text-ink-muted" },
  dark: { selected: "font-bold text-white", plain: "font-medium text-placeholder-dark" },
} as const;

// 각 톤이 놓이는 바탕 (Tailwind 색 이름)
export const CATEGORY_TAG_BACKGROUNDS = { light: "white", dark: "surface-dark" } as const;

export type CategoryTagTone = keyof typeof CATEGORY_TAG_TEXT_TONES;
