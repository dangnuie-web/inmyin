// INMYIN 데모 데이터 넣기 · 지우기. 자세한 사용법은 scripts/demo/README.md
//
//   마른 실행(아무것도 안 씀, DB 에 붙지도 않음):
//     node scripts/demo/demo-data.mjs seed <설정.json> --dry-run
//   넣기 (운영 DB 에 씀 — 당니님 승인 뒤에만):
//     node scripts/demo/demo-data.mjs seed <설정.json> --yes [--cutout] [--refresh-images]
//   지우기 미리보기(읽기만) → 지우기:
//     node scripts/demo/demo-data.mjs clean [--config <설정.json>]
//     node scripts/demo/demo-data.mjs clean [--config <설정.json>] --yes
//
// 필요한 환경 변수 (.env.local, 값은 출력하지 않는다):
//   NEXT_PUBLIC_SUPABASE_URL                       — 이미 있음
//   SUPABASE_SECRET_KEY (또는 SUPABASE_SERVICE_ROLE_KEY) — 서비스 키. 계정 만들기 · RLS 를 넘는 쓰기에 필요. 당니님이 넣는다

import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { clean, collectDemo, DEFAULT_EMAIL_DOMAIN, describeCollection, loadConfig, planSeed, seed } from "./lib.mjs";

const args = process.argv.slice(2);
const command = args[0];
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.slice(1).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--config" && all[i - 1] !== "--domain");

function usage(message) {
  if (message) console.error(message);
  console.error(`사용법:
  node scripts/demo/demo-data.mjs seed <설정.json> --dry-run
  node scripts/demo/demo-data.mjs seed <설정.json> --yes [--cutout] [--refresh-images]
  node scripts/demo/demo-data.mjs clean [--config <설정.json> | --domain <도메인>] [--yes]`);
  process.exit(1);
}

function connect() {
  const envFile = path.resolve(".env.local");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) usage("NEXT_PUBLIC_SUPABASE_URL 이 없습니다 (.env.local).");
  if (!key) usage("서비스 키가 없습니다. .env.local 에 SUPABASE_SECRET_KEY(또는 SUPABASE_SERVICE_ROLE_KEY)를 넣어 주세요. 값은 Supabase 대시보드 › Project Settings › API Keys.");
  console.log(`대상: ${new URL(url).host}`);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function readConfig(configPath) {
  const { errors, warnings, missing, config } = await loadConfig(configPath);
  for (const w of warnings) console.log(`알림  ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`오류  ${e}`);
    console.error(`설정에 오류 ${errors.length}개 — 아무것도 하지 않았습니다.`);
    process.exit(1);
  }
  return { config, missing };
}

if (command === "seed") {
  const configPath = positional[0];
  if (!configPath) usage("설정 파일 경로가 필요합니다.");
  const { config, missing } = await readConfig(configPath);
  const cutoutMode = flag("--cutout");

  if (flag("--dry-run") || !flag("--yes")) {
    for (const m of missing) console.log(`사진없음  ${m}`);
    const { lines, problems } = await planSeed(config, { cutoutMode });
    console.log(lines.join("\n"));
    if (problems.length) {
      console.error("");
      for (const p of problems) console.error(`문제  ${p}`);
      console.error(`사진 문제 ${problems.length}개`);
    }
    console.log("");
    if (missing.length) console.log(`사진 없는 필수 아이템 · 인벤토리 ${missing.length}개 — 이대로는 넣기(--yes)가 멈춥니다.`);
    console.log(flag("--dry-run") ? "마른 실행 — 아무것도 쓰지 않았습니다." : "미리보기만 했습니다. 실제로 넣으려면 --yes 를 붙이세요.");
    process.exit(problems.length ? 1 : 0);
  }

  if (missing.length) {
    for (const m of missing) console.error(`사진없음  ${m}`);
    console.error(`사진 없는 필수 아이템 · 인벤토리 ${missing.length}개 — DB 에 붙지 않고 멈춥니다.`);
    process.exit(1);
  }
  const supabase = connect();
  await seed(supabase, config, { cutoutMode, refreshImages: flag("--refresh-images") });
  console.log("넣기 끝.");
} else if (command === "clean") {
  const configPath = option("--config");
  const emailDomain = option("--domain") ?? (configPath ? (await readConfig(configPath)).config.emailDomain : DEFAULT_EMAIL_DOMAIN);
  const supabase = connect();
  const collection = await collectDemo(supabase, { emailDomain });
  console.log(describeCollection(collection).join("\n"));
  if (!collection.ids.length) process.exit(0);
  if (!flag("--yes")) {
    console.log("\n미리보기만 했습니다. 위 목록을 지우려면 --yes 를 붙여 다시 실행하세요.");
    process.exit(0);
  }
  await clean(supabase, collection);
  console.log("지우기 끝.");
} else {
  usage();
}
