// 이 앱이 가져다 쓰는 오픈소스와 그 라이선스 (설정 › 오픈소스 라이선스).
// package.json 의 dependencies 와 맞춰 둔다 — 새 라이브러리를 넣거나 빼면 여기도 고친다
export const OPEN_SOURCE_LICENSES = [
  { name: "Next.js", license: "MIT", url: "https://github.com/vercel/next.js" },
  { name: "React", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "Tailwind CSS", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss" },
  { name: "Supabase JS · SSR", license: "MIT", url: "https://github.com/supabase/supabase-js" },
  { name: "Pretendard", license: "SIL OFL 1.1", url: "https://github.com/orioncactus/pretendard" },
  { name: "ONNX Runtime Web", license: "MIT", url: "https://github.com/microsoft/onnxruntime" },
  // 남에게 서비스를 공개하기 전에 어떻게 할지 정해야 한다 (docs/roadmap.md "나중에 할 일")
  { name: "@imgly/background-removal", license: "AGPL-3.0", url: "https://github.com/imgly/background-removal-js" },
] as const;
