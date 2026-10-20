#!/usr/bin/env node
// 데모 INMYIN 게시물 그리기 — 설정의 posts 마다 캔버스 문서(JSON)와 완성 이미지(1080×1350 JPG, 앱 캡처와 같은 크기 · 형식)를 만든다.
//
//   npm run demo:posts -- <설정.json> --out <폴더> [--port 9475]
//
// 배치는 posts.mjs(무늬 템플릿 A · B). 그리기는 이 컴퓨터의 크롬을 화면 없이(headless) 띄워 캔버스로 한다 —
// 앱도 Konva(브라우저 캔버스)로 그리고, 글꼴(Wanted Sans)이 브라우저에서만 제대로 잡혀서다
// (sharp 의 글자 그리기는 이 Mac 에서 글꼴 파일 지정을 무시하고 시스템 글꼴로 그린다 — 2026-10-20 확인).
// DB 에는 붙지 않는다. 만든 파일 경로를 설정의 posts[].image · canvas 에 적고 seed 로 넣는다.

import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadConfig } from "./lib.mjs";
import { buildPostDocument, CANVAS_HEIGHT, CANVAS_WIDTH, placeMeasuredText, visibleBox } from "./posts.mjs";

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FONT_FILE = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../app/fonts/WantedSansVariable.woff2");
// 앱 캡처(Canvas.tsx)와 같은 JPG 화질
const JPEG_QUALITY = 0.92;

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const configPath = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const outDir = option("--out");
const port = Number(option("--port") ?? 9475);
if (!configPath || !outDir) {
  console.error("사용법: npm run demo:posts -- <설정.json> --out <폴더> [--port 9475]");
  process.exit(1);
}

const { errors, config } = await loadConfig(configPath);
if (errors.length) {
  for (const e of errors) console.error(`오류  ${e}`);
  process.exit(1);
}

// 게시물마다 문서 만들기 (글자 크기는 아직 0)
const files = new Map(); // code → 그릴 그림 파일 (누끼가 있으면 누끼)
const jobs = [];
for (const u of config.users) {
  const byCode = new Map(u.inventories.flatMap((inv) => inv.items.map((it) => [it.code, it])));
  for (const post of u.posts ?? []) {
    const items = [];
    for (const code of post.items) {
      const it = byCode.get(code);
      if (!it?.image) throw new Error(`${post.key}: ${code} 사진이 없습니다`);
      const file = it.cutout || it.image;
      files.set(code, file);
      items.push({ code, name: it.name, ...(await visibleBox(file)) });
    }
    jobs.push({ name: `${u.handle}-${post.key}`, doc: buildPostDocument(post, items, { handle: u.handle }) });
  }
}
if (!jobs.length) {
  console.log("설정에 posts 가 없습니다.");
  process.exit(0);
}

// 크롬이 읽을 파일을 내주는 작은 서버 (이 컴퓨터 안에서만)
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname === "/") {
      res.setHeader("content-type", "text/html");
      return res.end("<!doctype html><meta charset=utf-8><body></body>");
    }
    if (url.pathname === "/font.woff2") return res.end(await readFile(FONT_FILE));
    if (url.pathname === "/item") return res.end(await readFile(files.get(url.searchParams.get("code"))));
  } catch {
    /* 아래 404 */
  }
  res.statusCode = 404;
  res.end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 크롬 임시 프로필(한 번에 100MB 넘게)은 끝날 때 — 성공 · 실패 · Ctrl+C 모두 — 크롬을 닫은 뒤 지운다. 지우기 실패는 경고만.
let profile;
let chrome;
let ws;
let closing;
const shutdown = () =>
  (closing ??= (async () => {
    try {
      ws?.close();
    } catch {
      /* 이미 닫힘 */
    }
    server.close();
    if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
      const exited = new Promise((r) => chrome.once("exit", r));
      chrome.kill();
      // 3초 안에 안 꺼지면 강제로
      if ((await Promise.race([exited.then(() => true), sleep(3000).then(() => false)])) === false) {
        chrome.kill("SIGKILL");
        await Promise.race([exited, sleep(2000)]);
      }
    }
    if (profile) {
      try {
        await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch (e) {
        console.warn(`경고  임시 크롬 프로필을 지우지 못했습니다: ${profile} (${e.message})`);
      }
    }
  })());
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    console.error(`\n${signal} — 크롬을 닫고 임시 폴더를 지웁니다`);
    await shutdown();
    process.exit(signal === "SIGINT" ? 130 : 143);
  });
}
try {
  profile = await mkdtemp(path.join(tmpdir(), "inmyin-render-"));
  chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, "--use-mock-keychain", "--password-store=basic", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
  chrome.on("error", (e) => console.error(`오류  크롬을 실행하지 못했습니다: ${e.message}`));
  let target;
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250);
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page" && t.url === "about:blank");
    } catch {
      /* 아직 안 켜짐 */
    }
  }
  if (!target) throw new Error(`크롬을 켜지 못했습니다 (포트 ${port}). 다른 프로그램이 쓰는 포트면 --port 로 바꿔 주세요`);
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const wait = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) {
      wait.get(m.id)(m);
      wait.delete(m.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      const i = ++id;
      wait.set(i, r);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? "브라우저 오류");
    return r.result.result.value;
  };

  await send("Page.navigate", { url: base });
  await sleep(500);
  // 글꼴을 불러 두고, 글자 재기 · 그리기 함수를 페이지에 둔다
  await evaluate(`(async () => {
    const face = new FontFace("Wanted Sans", "url(/font.woff2)", { weight: "100 900" });
    document.fonts.add(await face.load());
    await document.fonts.load('bold 40px "Wanted Sans"', "가A");
    const fontOf = (t) => (t.bold ? "bold " : "") + t.fontSize + 'px "Wanted Sans"';
    window.measure = (texts) => {
      const c = document.createElement("canvas").getContext("2d");
      return texts.map((t) => { c.font = fontOf(t); return c.measureText(t.text).width; });
    };
    const images = new Map();
    const load = (code) => images.get(code) ?? images.set(code, new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = "/item?code=" + encodeURIComponent(code); })).get(code);
    // 앱 Canvas.tsx 와 같은 차례 · 같은 방식: 바닥 → 개체(적힌 순서), 그림과 글자는 왼쪽 위를 축으로 돌림, 글자는 가운데 정렬 · 줄 높이 1.3
    window.render = async (doc, quality) => {
      const canvas = document.createElement("canvas");
      canvas.width = ${CANVAS_WIDTH};
      canvas.height = ${CANVAS_HEIGHT};
      const c = canvas.getContext("2d");
      c.fillStyle = doc.background.color;
      c.fillRect(0, 0, canvas.width, canvas.height);
      for (const o of doc.objects) {
        c.save();
        c.translate(o.x, o.y);
        c.rotate((o.rotation * Math.PI) / 180);
        if (o.kind === "text") {
          c.font = fontOf(o);
          c.fillStyle = o.fill;
          c.textAlign = "center";
          c.textBaseline = "middle";
          c.fillText(o.text, o.width / 2, o.height / 2);
        } else {
          c.drawImage(await load(o.code), 0, 0, o.width, o.height);
        }
        c.restore();
      }
      return canvas.toDataURL("image/jpeg", quality);
    };
    return true;
  })()`);

  await mkdir(outDir, { recursive: true });
  for (const job of jobs) {
    const texts = job.doc.objects.filter((o) => o.kind === "text");
    const widths = await evaluate(`window.measure(${JSON.stringify(texts)})`);
    let t = 0;
    const doc = { ...job.doc, objects: job.doc.objects.map((o) => (o.kind === "text" ? placeMeasuredText(o, widths[t++]) : o)) };
    const dataUrl = await evaluate(`window.render(${JSON.stringify(doc)}, ${JPEG_QUALITY})`);
    const jpg = Buffer.from(dataUrl.split(",")[1], "base64");
    await writeFile(path.join(outDir, `${job.name}.jpg`), jpg);
    await writeFile(path.join(outDir, `${job.name}.json`), JSON.stringify(doc, null, 1));
    console.log(`그림  ${job.name}.jpg ${Math.round(jpg.length / 1024)}KB · 개체 ${doc.objects.length}`);
  }
  console.log(`게시물 ${jobs.length}개 → ${outDir}`);
} finally {
  await shutdown();
}
