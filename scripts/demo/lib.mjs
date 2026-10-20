// 데모 데이터 넣기 · 지우기의 본체. 사용법은 같은 폴더의 README.md.
//
// DB 에 쓰는 함수는 Supabase 클라이언트를 인자로 받는다 — 시험(demo-data.test.mjs)에서는 가짜 클라이언트를 넣는다.
// 테이블 · 칸 이름은 supabase/migrations 를 따른다 (문서의 camelCase → DB 의 snake_case).

import { createHash, randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { whiteBackgroundCutout } from "./cutout.mjs";

// ─────────────────────────────────────────────────────────────
// 앱과 같아야 하는 값 (바뀌면 여기도 같이)
// ─────────────────────────────────────────────────────────────

// lib/plans.ts
export const PLANS = {
  basic: { maxInventories: 5, slotCount: 25, maxBookmarks: 500 },
  premium: { maxInventories: 20, slotCount: 50, maxBookmarks: 2000 },
};
// lib/auth/rules.ts · DB users_handle_format
export const HANDLE_PATTERN = /^[a-z0-9_]{3,30}$/;
export const NICKNAME_MAX = 20;
// lib/inventory/rules.ts · lib/categories.ts · DB inventories_categories_check
export const INVENTORY_NAME_MAX = 20;
export const MAX_CATEGORIES = 10;
export const MAX_CATEGORY_LENGTH = 10;
// lib/item/rules.ts
export const ITEM_NAME_MAX = 30;
export const ITEM_DESCRIPTION_MAX = 300;
export const ITEM_QUANTITY_MAX = 999;
export const ACQUIRED_NOTE_MAX = 20;
// lib/image/resize.ts · lib/image/upload.ts — 썸네일 640, 원본 1280, 프로필 320. 화질 0.85
export const THUMBNAIL_MAX_SIDE = 640;
export const RAW_MAX_SIDE = 1280;
export const AVATAR_MAX_SIDE = 320;
const WEBP_QUALITY = 85;

// 오피스 로드맵 3단계 "카테고리 고정 8개". 아직 DB 칸이 없어서 설정에만 받아 두고 넣지는 않는다
export const FIXED_CATEGORIES = ["가방", "데스크", "파우치", "옷장", "굿즈·수집", "취미", "집·주방", "여행·아웃도어"];

// ─────────────────────────────────────────────────────────────
// 데모 표시 — 지우기는 이 두 표시가 모두 있는 계정만 찾는다
//   1) 이메일이 demo+<아이디>@<데모 도메인>
//   2) auth 의 app_metadata.inmyin_demo === true (서비스 키로만 쓸 수 있는 칸이라 유저가 스스로 붙일 수 없다)
// ─────────────────────────────────────────────────────────────

// 실제로 메일이 갈 수 없는 도메인(.invalid 는 인터넷 표준상 존재하지 않는 최상위 도메인)
export const DEFAULT_EMAIL_DOMAIN = "demo.inmyin.invalid";
export const DEMO_FLAG = "inmyin_demo";

export function demoEmail(handle, domain = DEFAULT_EMAIL_DOMAIN) {
  return `demo+${handle}@${domain}`.toLowerCase();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isDemoEmail(email, domain = DEFAULT_EMAIL_DOMAIN) {
  return new RegExp(`^demo\\+[a-z0-9_]{3,30}@${escapeRegExp(domain.toLowerCase())}$`).test(String(email ?? "").toLowerCase());
}

export function hasDemoFlag(authUser) {
  return authUser?.app_metadata?.[DEMO_FLAG] === true;
}

// 두 표시가 모두 있어야 데모
export function isDemoAuthUser(authUser, domain = DEFAULT_EMAIL_DOMAIN) {
  return isDemoEmail(authUser?.email, domain) && hasDemoFlag(authUser);
}

// ─────────────────────────────────────────────────────────────
// 고정 id — 다시 돌려도 같은 id 가 나와서 중복이 생기지 않는다 (UUID v5 방식: 이름 → 항상 같은 id)
// ─────────────────────────────────────────────────────────────

const NAMESPACE = "3f0c2a8e-6b1d-4c7a-9e55-1d2b7c9a4e10";

export function stableUuid(name) {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(ns).update(`inmyin-demo:${name}`).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // 버전 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 변형
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const inventoryId = (handle, key) => stableUuid(`inventory:${handle}:${key}`);
export const itemId = (code) => stableUuid(`item:${code}`);

// ─────────────────────────────────────────────────────────────
// 설정 파일 읽기 · 검사
// ─────────────────────────────────────────────────────────────

const ITEM_CODE_PATTERN = /^\d+-\d{2,}$/;

const isText = (value) => typeof value === "string";
const trimmed = (value) => (isText(value) ? value.trim() : "");

// 설정을 앱 규칙대로 검사하고, 바로 쓸 수 있는 꼴(경로는 절대 경로, 기본값 채움)로 돌려준다.
// 틀린 곳이 하나라도 있으면 errors 에 모두 모아 돌려준다 — 고칠 곳을 한 번에 보여 주려고
export function normalizeConfig(raw, configDir) {
  const errors = [];
  const warnings = [];
  const fail = (where, message) => errors.push(`${where}: ${message}`);

  if (!raw || typeof raw !== "object") return { errors: ["설정이 JSON 객체가 아닙니다"], warnings, config: null };

  // "~/..." 은 홈 폴더, 상대 경로는 설정 파일이 있는 폴더 기준
  const dirText = trimmed(raw.imageDir) || ".";
  const imageDir = dirText.startsWith("~/") ? path.join(homedir(), dirText.slice(2)) : path.resolve(configDir, dirText);
  const emailDomain = trimmed(raw.emailDomain) || DEFAULT_EMAIL_DOMAIN;
  if (!/^[a-z0-9.-]+\.[a-z]+$/.test(emailDomain)) fail("emailDomain", `도메인 꼴이 아닙니다 (${emailDomain})`);
  const file = (value) => (trimmed(value) ? path.resolve(imageDir, trimmed(value)) : null);

  const users = [];
  const handles = new Set();
  const numbers = new Set();
  const codes = new Map(); // 아이템 번호 → 주인 아이디

  if (!Array.isArray(raw.users) || raw.users.length === 0) fail("users", "유저가 한 명도 없습니다");

  for (const [userIndex, u] of (Array.isArray(raw.users) ? raw.users : []).entries()) {
    const where = `users[${userIndex}]`;
    const handle = trimmed(u?.handle);
    const nickname = trimmed(u?.nickname);
    const no = u?.no;
    const plan = trimmed(u?.plan) || "basic";

    if (!Number.isInteger(no) || no < 1) fail(where, "no(유저 번호)는 1 이상의 정수여야 합니다");
    else if (numbers.has(no)) fail(where, `no ${no} 가 겹칩니다`);
    else numbers.add(no);
    if (!HANDLE_PATTERN.test(handle)) fail(where, `handle 은 영어 소문자 · 숫자 · _ 3~30자 (${handle || "비어 있음"})`);
    else if (handles.has(handle)) fail(where, `handle ${handle} 이 겹칩니다`);
    else handles.add(handle);
    if (!nickname) fail(where, "nickname 이 비어 있습니다");
    else if (nickname.length > NICKNAME_MAX) fail(where, `nickname 은 ${NICKNAME_MAX}자까지`);
    if (!(plan in PLANS)) fail(where, `plan 은 basic 또는 premium (${plan})`);
    const bio = trimmed(u?.bio) || null;
    if (bio && bio.length > 150) warnings.push(`${where}: bio 가 150자를 넘습니다 — 앱에 아직 길이 한도는 없지만 프로필에서 길어 보일 수 있음`);

    const limits = PLANS[plan] ?? PLANS.basic;
    const inventories = [];
    const rawInventories = Array.isArray(u?.inventories) ? u.inventories : [];
    if (rawInventories.length > limits.maxInventories) fail(where, `인벤토리는 ${plan} 플랜에서 ${limits.maxInventories}개까지`);
    const inventoryKeys = new Set();

    for (const [invIndex, inv] of rawInventories.entries()) {
      const iwhere = `${where}.inventories[${invIndex}]`;
      const key = trimmed(inv?.key) || String(invIndex + 1);
      if (inventoryKeys.has(key)) fail(iwhere, `key ${key} 가 겹칩니다`);
      inventoryKeys.add(key);
      const name = trimmed(inv?.name);
      if (!name) fail(iwhere, "name 이 비어 있습니다");
      else if (name.length > INVENTORY_NAME_MAX) fail(iwhere, `name 은 ${INVENTORY_NAME_MAX}자까지`);

      const category = trimmed(inv?.category) || null;
      if (category && !FIXED_CATEGORIES.includes(category)) {
        warnings.push(`${iwhere}: category "${category}" 는 고정 8개(${FIXED_CATEGORIES.join(" · ")})에 없습니다`);
      }

      const tags = [];
      for (const tag of Array.isArray(inv?.tags) ? inv.tags : []) {
        const t = trimmed(tag);
        if (!t) fail(iwhere, "빈 태그가 있습니다");
        else if (t.length > MAX_CATEGORY_LENGTH) fail(iwhere, `태그 "${t}" 는 ${MAX_CATEGORY_LENGTH}자까지`);
        else if (tags.includes(t)) fail(iwhere, `태그 "${t}" 가 겹칩니다`);
        else tags.push(t);
      }

      const slotCount = inv?.slotCount ?? limits.slotCount;
      if (!Number.isInteger(slotCount) || slotCount < 1) fail(iwhere, "slotCount 는 1 이상의 정수");
      else if (slotCount > limits.slotCount) fail(iwhere, `slotCount 는 ${plan} 플랜에서 ${limits.slotCount}칸까지`);

      const items = [];
      const rawItems = Array.isArray(inv?.items) ? inv.items : [];
      if (Number.isInteger(slotCount) && rawItems.length > slotCount) fail(iwhere, `아이템 ${rawItems.length}개가 칸 수 ${slotCount} 를 넘습니다`);

      for (const [itemIndex, it] of rawItems.entries()) {
        const twhere = `${iwhere}.items[${itemIndex}]`;
        const code = trimmed(it?.code);
        if (!ITEM_CODE_PATTERN.test(code)) fail(twhere, `code 는 "1-01" 꼴 (${code || "비어 있음"})`);
        else if (codes.has(code)) fail(twhere, `code ${code} 가 겹칩니다`);
        else {
          codes.set(code, handle);
          if (Number.isInteger(no) && code.split("-")[0] !== String(no)) {
            warnings.push(`${twhere}: code ${code} 의 앞 번호가 유저 번호 ${no} 와 다릅니다`);
          }
        }
        const itemName = trimmed(it?.name);
        if (!itemName) fail(twhere, "name 이 비어 있습니다");
        else if (itemName.length > ITEM_NAME_MAX) fail(twhere, `name 은 ${ITEM_NAME_MAX}자까지 (${itemName.length}자)`);
        const description = trimmed(it?.description);
        // 앱(M-08)에서 설명은 필수다
        if (!description) fail(twhere, "description 이 비어 있습니다 (앱에서 필수)");
        else if (description.length > ITEM_DESCRIPTION_MAX) fail(twhere, `description 은 ${ITEM_DESCRIPTION_MAX}자까지`);
        const quantity = it?.quantity ?? 1;
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > ITEM_QUANTITY_MAX) fail(twhere, `quantity 는 1~${ITEM_QUANTITY_MAX}`);
        const acquiredNote = trimmed(it?.acquiredNote) || null;
        if (acquiredNote && acquiredNote.length > ACQUIRED_NOTE_MAX) fail(twhere, `acquiredNote 는 ${ACQUIRED_NOTE_MAX}자까지`);
        const tag = trimmed(it?.tag) || null;
        if (tag && tag.length > MAX_CATEGORY_LENGTH) fail(twhere, `tag "${tag}" 는 ${MAX_CATEGORY_LENGTH}자까지`);
        // 앱처럼, 아이템에 새로 쓴 태그는 인벤토리 태그에도 더한다 (lib/item/save.ts)
        if (tag && !tags.includes(tag)) {
          if (tags.length >= MAX_CATEGORIES) fail(twhere, `tag "${tag}" 를 더하면 인벤토리 태그가 ${MAX_CATEGORIES}개를 넘습니다`);
          else {
            tags.push(tag);
            warnings.push(`${twhere}: tag "${tag}" 가 인벤토리 tags 에 없어서 더했습니다`);
          }
        }
        const image = file(it?.image);
        if (!image) fail(twhere, "image 가 비어 있습니다");
        items.push({
          code,
          id: itemId(code),
          name: itemName,
          description,
          tag,
          quantity,
          acquiredNote,
          isPublic: it?.isPublic !== false,
          // 선택 아이템: 사진이 없으면 건너뛴다 (필수 아이템은 사진이 없으면 넣기를 멈춘다)
          optional: it?.optional === true,
          image,
          // 누끼 파일 경로, 또는 false(--cutout 이어도 이 아이템은 배경 그대로 — 흰 물건처럼 자동 누끼가 먹는 것)
          cutout: it?.cutout === false ? false : file(it?.cutout),
        });
      }

      if (tags.length > MAX_CATEGORIES) fail(iwhere, `태그는 ${MAX_CATEGORIES}개까지`);
      // 인벤토리 사진은 앱에서 필수. 없으면 사진을 찾은 뒤(resolveFiles) 첫 아이템 사진을 쓴다
      const image = file(inv?.image);
      if (!image && items.length === 0) fail(iwhere, "image 도 아이템도 없습니다 (인벤토리 사진은 앱에서 필수)");

      inventories.push({
        key,
        id: handle ? inventoryId(handle, key) : null,
        name,
        category,
        tags,
        slotCount,
        isPublic: inv?.isPublic !== false,
        image,
        sortOrder: invIndex,
        items,
      });
    }

    users.push({
      no,
      handle,
      nickname,
      bio,
      plan,
      email: demoEmail(handle, emailDomain),
      avatar: file(u?.avatar),
      inventories,
      follows: Array.isArray(u?.follows) ? u.follows : [],
      bookmarks: Array.isArray(u?.bookmarks) ? u.bookmarks : [],
      hearts: Array.isArray(u?.hearts) ? u.hearts : [],
    });
  }

  // 팔로우는 유저 번호(no) 또는 아이디(handle)로, 북마크 · 하트는 아이템 번호(code)로 가리킨다
  const byNo = new Map(users.map((u) => [u.no, u.handle]));
  for (const u of users) {
    const where = `users(${u.handle})`;
    u.follows = u.follows.flatMap((ref) => {
      const target = typeof ref === "number" ? byNo.get(ref) : handles.has(ref) ? ref : null;
      if (!target) return fail(where, `follows 의 ${JSON.stringify(ref)} 를 찾을 수 없습니다`), [];
      if (target === u.handle) return fail(where, "자기 자신은 팔로우할 수 없습니다"), [];
      return [target];
    });
    u.follows = [...new Set(u.follows)];
    for (const kind of ["bookmarks", "hearts"]) {
      u[kind] = [...new Set(u[kind])].flatMap((code) => {
        if (!codes.has(code)) return fail(where, `${kind} 의 아이템 번호 ${JSON.stringify(code)} 를 찾을 수 없습니다`), [];
        return [code];
      });
    }
    if (u.bookmarks.length > PLANS[u.plan]?.maxBookmarks) fail(where, "북마크가 플랜 한도를 넘습니다");
  }

  // 북마크 · 하트는 공개 아이템에만 (DB 트리거가 비공개 남의 아이템은 막는다)
  const privateItems = new Map();
  for (const u of users) for (const inv of u.inventories) for (const it of inv.items) {
    if (!it.isPublic || !inv.isPublic) privateItems.set(it.code, u.handle);
  }
  for (const u of users) for (const kind of ["bookmarks", "hearts"]) for (const code of u[kind]) {
    const owner = privateItems.get(code);
    if (owner && owner !== u.handle) fail(`users(${u.handle})`, `${kind} 의 ${code} 는 비공개라 남이 누를 수 없습니다`);
  }

  return { errors, warnings, config: errors.length ? null : { imageDir, emailDomain, users } };
}

// 설정 읽기 → 검사 → 사진 파일 찾기. missing 은 사진이 없어 넣을 수 없는 것(마른 실행에서는 경고, 넣기에서는 멈춤)
export async function loadConfig(configPath) {
  const text = await readFile(configPath, "utf8");
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return { errors: [`JSON 을 읽지 못했습니다: ${error.message}`], warnings: [], missing: [], config: null };
  }
  const result = normalizeConfig(raw, path.dirname(path.resolve(configPath)));
  if (!result.config) return { ...result, missing: [] };
  const { missing, notes } = await resolveFiles(result.config);
  return { ...result, warnings: [...result.warnings, ...notes], missing };
}

// ─────────────────────────────────────────────────────────────
// 사진 파일 찾기
//   "1_모모/1-01*"   → 1_모모 폴더에서 이름이 1-01 로 시작하는 사진 하나 (1-010 처럼 숫자가 이어지는 것은 아님)
//   "1_모모/profile*" → profile 로 시작하는 사진 하나
//   별표가 없으면 그 파일 그대로
// 사진 확장자는 png · jpg · jpeg · webp. 둘 이상 맞으면 어느 것인지 몰라 "없음"으로 치고 알린다
// ─────────────────────────────────────────────────────────────

const IMAGE_FILE = /\.(png|jpe?g|webp)$/i;

export async function findImage(pattern) {
  if (typeof pattern !== "string") return { file: pattern ?? null };
  if (!pattern.endsWith("*")) return { file: pattern };
  const dir = path.dirname(pattern);
  const prefix = path.basename(pattern).slice(0, -1).normalize("NFC");
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return { file: null, reason: `폴더 없음 (${dir})` };
  }
  const matches = names.filter((raw) => {
    // macOS 는 한글 파일 이름을 자모로 풀어(NFD) 줄 수 있어서 맞춰 비교한다
    const name = raw.normalize("NFC");
    if (!IMAGE_FILE.test(name) || !name.startsWith(prefix)) return false;
    return !(/\d$/.test(prefix) && /^\d/.test(name.slice(prefix.length)));
  });
  if (matches.length === 1) return { file: path.join(dir, matches[0]) };
  if (matches.length === 0) return { file: null, reason: `${path.basename(dir)}/ 에 ${prefix}… 사진 없음` };
  return { file: null, reason: `${path.basename(dir)}/ 에 ${prefix}… 사진이 ${matches.length}개 (${matches.join(", ")}) — 하나만 남기거나 파일 이름을 적어 주세요` };
}

// 패턴을 실제 파일로 바꾼다. 선택 아이템 · 프로필 사진은 없으면 빼고, 필수 아이템 · 인벤토리 사진이 없으면 missing 에 담는다.
// 빠진 아이템을 가리키던 북마크 · 하트도 뺀다
export async function resolveFiles(config) {
  const missing = [];
  const notes = [];
  const dropped = new Set();
  for (const u of config.users) {
    if (u.avatar) {
      const found = await findImage(u.avatar);
      if (!found.file) notes.push(`@${u.handle}: 프로필 사진 ${found.reason} — 프로필 사진 없이 넣습니다`);
      u.avatar = found.file;
    }
    for (const inv of u.inventories) {
      const kept = [];
      for (const it of inv.items) {
        const found = await findImage(it.image);
        if (found.file && typeof it.cutout === "string") {
          const cut = await findImage(it.cutout);
          if (!cut.file) notes.push(`${it.code}: 누끼 ${cut.reason} — 누끼 파일 없이`);
          it.cutout = cut.file;
        }
        if (found.file) {
          it.image = found.file;
          kept.push(it);
        } else if (it.optional) {
          notes.push(`${it.code} ${it.name}: ${found.reason} — 선택 아이템이라 건너뜁니다`);
          dropped.add(it.code);
        } else {
          it.image = null;
          missing.push(`${it.code} ${it.name}: ${found.reason}`);
          kept.push(it);
        }
      }
      inv.items = kept;
      if (inv.image) {
        const found = await findImage(inv.image);
        if (!found.file) notes.push(`인벤토리 ${inv.name}: 사진 ${found.reason} — 첫 아이템 사진으로`);
        inv.image = found.file;
      }
      if (!inv.image) {
        const first = inv.items.find((it) => it.image);
        if (first) inv.image = first.image;
        else missing.push(`인벤토리 ${inv.name}: 사진이 없습니다 (인벤토리 사진도, 사진 있는 아이템도 없음)`);
      }
    }
  }
  for (const u of config.users) {
    for (const kind of ["bookmarks", "hearts"]) {
      const gone = u[kind].filter((code) => dropped.has(code));
      if (gone.length) notes.push(`@${u.handle}: ${kind} 의 ${gone.join(", ")} 는 건너뛴 아이템이라 뺍니다`);
      u[kind] = u[kind].filter((code) => !dropped.has(code));
    }
  }
  return { missing, notes };
}

// ─────────────────────────────────────────────────────────────
// 사진 — 앱(lib/image/upload.ts)과 같은 크기 · 형식으로 만든다
// ─────────────────────────────────────────────────────────────

async function toWebp(input, maxSide) {
  const { data, info } = await sharp(input)
    .rotate() // 사진의 회전 정보대로 세운다 (앱의 imageOrientation: "from-image")
    .resize(maxSide, maxSide, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height, extension: "webp", contentType: "image/webp" };
}

// image · cutout 은 파일 경로 또는 Buffer.
// 썸네일 + 원본 한 쌍. 썸네일은 누끼 파일이 있으면 그것, cutout 모드면 흰 배경을 지운 것, 아니면 원본 그대로
export async function makePhotoPair({ image, cutout }, { cutoutMode = false } = {}) {
  let thumbSource = image;
  let background = "그대로";
  if (cutout) {
    thumbSource = cutout;
    background = "누끼 파일";
  } else if (cutoutMode && cutout !== false) {
    thumbSource = await whiteBackgroundCutout(typeof image === "string" ? await readFile(image) : image);
    background = "흰 배경 지움";
  }
  const [thumbnail, raw] = await Promise.all([toWebp(thumbSource, THUMBNAIL_MAX_SIDE), toWebp(image, RAW_MAX_SIDE)]);
  return { thumbnail, raw, background };
}

export async function makeAvatar(file) {
  const avatar = await toWebp(file, AVATAR_MAX_SIDE);
  // 사진이 바뀌면 이름도 바뀐다 — 앱처럼 "바꿀 때마다 새 파일"(브라우저가 옛 사진을 붙잡지 않게), 같은 사진이면 같은 이름
  const name = `${createHash("sha1").update(avatar.buffer).digest("hex").slice(0, 16)}.webp`;
  return { ...avatar, name };
}

// ─────────────────────────────────────────────────────────────
// 공용
// ─────────────────────────────────────────────────────────────

function must(result, what) {
  if (result?.error) {
    const e = result.error;
    throw new Error(`${what} 실패: ${e.message ?? e}${e.code ? ` (${e.code})` : ""}`);
  }
  return result?.data;
}

function chunks(list, size = 100) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function selectIn(supabase, table, columns, column, values) {
  const rows = [];
  for (const part of chunks([...new Set(values)])) {
    rows.push(...(must(await supabase.from(table).select(columns).in(column, part), `${table} 읽기`) ?? []));
  }
  return rows;
}

async function deleteIn(supabase, table, column, values) {
  for (const part of chunks([...new Set(values)])) {
    must(await supabase.from(table).delete().in(column, part), `${table} 지우기`);
  }
}

export async function listAllAuthUsers(supabase) {
  const all = [];
  for (let page = 1; ; page++) {
    const data = must(await supabase.auth.admin.listUsers({ page, perPage: 1000 }), "계정 목록 읽기");
    const users = data?.users ?? [];
    all.push(...users);
    if (users.length < 1000) return all;
  }
}

function publicUrl(supabase, bucket, filePath) {
  return supabase.storage.from(bucket).getPublicUrl(filePath).data.publicUrl;
}

async function upload(supabase, bucket, filePath, photo) {
  must(await supabase.storage.from(bucket).upload(filePath, photo.buffer, { contentType: photo.contentType, upsert: true }), `${bucket}/${filePath} 올리기`);
}

// ─────────────────────────────────────────────────────────────
// 넣기
// ─────────────────────────────────────────────────────────────

// 마른 실행: DB 에 붙지 않는다. 파일이 다 있는지, 사진이 만들어지는지까지 확인하고 넣을 내용을 줄로 돌려준다
export async function planSeed(config, { cutoutMode = false, processImages = true } = {}) {
  const lines = [];
  const problems = [];
  const check = async (label, fn) => {
    try {
      return await fn();
    } catch (error) {
      problems.push(`${label}: ${error.message}`);
      return null;
    }
  };

  lines.push(`데모 이메일 도메인: ${config.emailDomain}`);
  for (const u of config.users) {
    lines.push("");
    lines.push(`유저 ${u.no} · ${u.nickname} (@${u.handle}) · ${u.email} · ${u.plan}`);
    if (u.avatar) {
      const avatar = processImages ? await check(`${u.handle} 프로필 사진`, () => makeAvatar(u.avatar)) : null;
      lines.push(`  프로필 사진 ${label(u.avatar)}${avatar ? ` → avatars/<id>/${avatar.name} ${avatar.width}×${avatar.height} ${kb(avatar.buffer)}` : ""}`);
    } else lines.push("  프로필 사진 없음");
    for (const inv of u.inventories) {
      const pair = processImages && inv.image ? await check(`${u.handle}/${inv.name} 인벤토리 사진`, () => makePhotoPair({ image: inv.image })) : null;
      lines.push(
        `  인벤토리 "${inv.name}" ${inv.slotCount}칸 · ${inv.isPublic ? "공개" : "비공개"} · 태그 [${inv.tags.join(", ")}]` +
          `${inv.category ? ` · 카테고리 ${inv.category}(DB 칸 없음 — 넣지 않음)` : ""} · id ${inv.id}` +
          `${pair ? ` · 사진 ${pair.thumbnail.width}×${pair.thumbnail.height} ${kb(pair.thumbnail.buffer)}` : ""}`,
      );
      for (const [index, it] of inv.items.entries()) {
        const p = processImages && it.image ? await check(`${it.code} 사진`, () => makePhotoPair(it, { cutoutMode })) : null;
        lines.push(
          `    ${String(index + 1).padStart(2)}칸 ${it.code} ${it.name}${it.tag ? ` #${it.tag}` : ""}${it.isPublic ? "" : " (비공개)"}` +
            `${it.optional ? " (선택)" : ""} · ${it.image ? label(it.image) : "사진 없음"}` +
            (p ? ` → 썸네일 ${p.thumbnail.width}×${p.thumbnail.height} ${kb(p.thumbnail.buffer)}(배경 ${p.background}) · 원본 ${p.raw.width}×${p.raw.height} ${kb(p.raw.buffer)}` : ""),
        );
      }
    }
    if (u.follows.length) lines.push(`  팔로우 → ${u.follows.map((h) => `@${h}`).join(", ")}`);
    if (u.bookmarks.length) lines.push(`  북마크 → ${u.bookmarks.join(", ")}`);
    if (u.hearts.length) lines.push(`  하트 → ${u.hearts.join(", ")}`);
  }

  const count = (fn) => config.users.reduce((sum, u) => sum + fn(u), 0);
  lines.push("");
  lines.push(
    `합계: 유저 ${config.users.length} · 인벤토리 ${count((u) => u.inventories.length)} · 아이템 ${count((u) => u.inventories.reduce((s, i) => s + i.items.length, 0))}` +
      ` · 팔로우 ${count((u) => u.follows.length)} · 북마크 ${count((u) => u.bookmarks.length)} · 하트 ${count((u) => u.hearts.length)}`,
  );
  return { lines, problems };
}

function label(file) {
  if (!file) return "없음";
  return typeof file === "string" ? path.basename(file) : "(메모리)";
}

function kb(buffer) {
  return `${Math.round(buffer.length / 1024)}KB`;
}

// 실제로 넣는다. 다시 돌리면: 있는 계정 · 인벤토리 · 아이템은 글자만 갱신, 사진은 refreshImages 일 때만 다시 올림, 관계는 있으면 건너뜀
export async function seed(supabase, config, { cutoutMode = false, refreshImages = false, log = console.log } = {}) {
  // 사진이 없는 필수 아이템 · 인벤토리가 있으면 DB 에 붙기 전에 멈춘다
  const noPhoto = config.users.flatMap((u) => u.inventories.flatMap((inv) => [
    ...(inv.image ? [] : [`인벤토리 ${inv.name}`]),
    ...inv.items.filter((it) => !it.image).map((it) => it.code),
  ]));
  if (noPhoto.length) throw new Error(`사진이 없어 넣을 수 없습니다: ${noPhoto.join(", ")}`);

  // ① 먼저 읽기만 해서 막힐 곳을 다 찾는다 — 중간에 멈춰 반쯤 들어가는 일을 줄이려고
  const authUsers = await listAllAuthUsers(supabase);
  const authByEmail = new Map(authUsers.map((u) => [String(u.email ?? "").toLowerCase(), u]));
  for (const u of config.users) {
    const existing = authByEmail.get(u.email);
    if (existing && !hasDemoFlag(existing)) {
      throw new Error(`${u.email} 계정이 이미 있는데 데모 표시(app_metadata.${DEMO_FLAG})가 없습니다. 실제 계정일 수 있어 멈춥니다`);
    }
  }
  const takenHandles = await selectIn(supabase, "users", "id, handle", "handle", config.users.map((u) => u.handle));
  for (const row of takenHandles) {
    const owner = authUsers.find((a) => a.id === row.id);
    if (!owner || !isDemoAuthUser(owner, config.emailDomain)) {
      throw new Error(`아이디 @${row.handle} 를 실제 유저가 쓰고 있습니다. 설정의 handle 을 바꿔 주세요`);
    }
  }

  // ② 계정 + 프로필
  const ids = new Map(); // handle → user id
  for (const u of config.users) {
    let authUser = authByEmail.get(u.email);
    if (!authUser) {
      const data = must(
        await supabase.auth.admin.createUser({
          email: u.email,
          // 아무도 이 비밀번호를 모른다. 데모 계정으로 로그인할 일이 생기면 대시보드에서 바꾼다
          password: randomBytes(24).toString("base64url"),
          email_confirm: true,
          app_metadata: { [DEMO_FLAG]: true },
          user_metadata: { demo: true },
        }),
        `${u.email} 계정 만들기`,
      );
      authUser = data.user;
      log(`계정 만듦 @${u.handle}`);
    } else log(`계정 있음 @${u.handle}`);
    const id = authUser.id;
    ids.set(u.handle, id);

    const [profile] = await selectIn(supabase, "users", "id, avatar_url", "id", [id]);
    const fields = { handle: u.handle, nickname: u.nickname, bio: u.bio, plan: u.plan };
    if (profile) must(await supabase.from("users").update(fields).eq("id", id), `@${u.handle} 프로필 갱신`);
    else must(await supabase.from("users").insert({ id, ...fields, provider: "email" }), `@${u.handle} 프로필 만들기`);

    if (u.avatar && (refreshImages || !profile?.avatar_url)) {
      const avatar = await makeAvatar(u.avatar);
      const filePath = `${id}/${avatar.name}`;
      await upload(supabase, "avatars", filePath, avatar);
      must(await supabase.from("users").update({ avatar_url: publicUrl(supabase, "avatars", filePath) }).eq("id", id), `@${u.handle} 프로필 사진`);
    }
  }

  // ③ 인벤토리 + 아이템. 아이템은 설정 순서대로 하나씩 — 칸 번호는 DB 가 맨 뒤 번호로 준다 (규칙 3)
  for (const u of config.users) {
    const userId = ids.get(u.handle);
    for (const inv of u.inventories) {
      const [existingInv] = await selectIn(supabase, "inventories", "id, deleted_at", "id", [inv.id]);
      const invFields = { name: inv.name, categories: inv.tags, is_public: inv.isPublic, slot_count: inv.slotCount, sort_order: inv.sortOrder };
      let invImages = {};
      if (!existingInv || refreshImages) {
        const pair = await makePhotoPair({ image: inv.image });
        const thumbPath = `${userId}/${inv.id}.${pair.thumbnail.extension}`;
        const rawPath = `${userId}/${inv.id}.${pair.raw.extension}`;
        await upload(supabase, "inventories", thumbPath, pair.thumbnail);
        await upload(supabase, "inventories-raw", rawPath, pair.raw);
        // 앱과 같이: 썸네일은 공개 주소, 원본은 비공개 저장소라 경로만
        invImages = { image_url: publicUrl(supabase, "inventories", thumbPath), raw_image_url: rawPath };
      }
      if (existingInv) {
        must(await supabase.from("inventories").update({ ...invFields, ...invImages, deleted_at: null }).eq("id", inv.id), `인벤토리 ${inv.name} 갱신`);
        log(`  인벤토리 있음 ${inv.name}`);
      } else {
        must(await supabase.from("inventories").insert({ id: inv.id, user_id: userId, ...invFields, ...invImages }), `인벤토리 ${inv.name} 만들기`);
        log(`  인벤토리 만듦 ${inv.name}`);
      }

      const existingItems = new Map(
        (await selectIn(supabase, "items", "id, inventory_id, deleted_at", "id", inv.items.map((it) => it.id))).map((row) => [row.id, row]),
      );
      for (const it of inv.items) {
        const existing = existingItems.get(it.id);
        const fields = {
          name: it.name,
          description: it.description,
          category: it.tag,
          quantity: it.quantity,
          acquired_note: it.acquiredNote,
          is_public: it.isPublic,
        };
        let images = {};
        if (!existing || refreshImages) {
          const pair = await makePhotoPair(it, { cutoutMode });
          const thumbPath = `${userId}/${it.id}.${pair.thumbnail.extension}`;
          const rawPath = `${userId}/${it.id}.${pair.raw.extension}`;
          await upload(supabase, "items", thumbPath, pair.thumbnail);
          await upload(supabase, "items-raw", rawPath, pair.raw);
          images = { image_url: publicUrl(supabase, "items", thumbPath), raw_image_url: rawPath };
        }
        if (existing) {
          const update = { ...fields, ...images };
          // 다른 인벤토리로 옮겼거나 지워져 있던 것만 자리를 건드린다 — 그대로면 칸 번호를 바꾸지 않는다
          if (existing.inventory_id !== inv.id || existing.deleted_at) Object.assign(update, { inventory_id: inv.id, deleted_at: null });
          must(await supabase.from("items").update(update).eq("id", it.id), `아이템 ${it.code} 갱신`);
        } else {
          must(await supabase.from("items").insert({ id: it.id, user_id: userId, inventory_id: inv.id, ...fields, ...images }), `아이템 ${it.code} 넣기`);
        }
        log(`    ${existing ? "갱신" : "넣음"} ${it.code} ${it.name}`);
      }
    }
  }

  // ④ 팔로우 · 북마크 · 하트. 기본키가 같은 줄은 건너뛴다
  const follows = config.users.flatMap((u) => u.follows.map((h) => ({ follower_id: ids.get(u.handle), following_id: ids.get(h) })));
  const targetRows = (kind) =>
    config.users.flatMap((u) => u[kind].map((code) => ({ user_id: ids.get(u.handle), target_type: "item", target_id: itemId(code) })));
  if (follows.length) must(await supabase.from("follows").upsert(follows, { onConflict: "follower_id,following_id", ignoreDuplicates: true }), "팔로우");
  for (const kind of ["bookmarks", "hearts"]) {
    const rows = targetRows(kind);
    if (rows.length) must(await supabase.from(kind).upsert(rows, { onConflict: "user_id,target_type,target_id", ignoreDuplicates: true }), kind);
  }
  log(`관계: 팔로우 ${follows.length} · 북마크 ${targetRows("bookmarks").length} · 하트 ${targetRows("hearts").length} (이미 있던 것은 건너뜀)`);
  return { userIds: Object.fromEntries(ids) };
}

// ─────────────────────────────────────────────────────────────
// 지우기
// ─────────────────────────────────────────────────────────────

const BUCKETS = ["items", "items-raw", "inventories", "inventories-raw", "avatars", "posts"];

// 데모 계정과, 그것에 딸린 모든 줄 · 파일을 모은다. 읽기만 한다
export async function collectDemo(supabase, { emailDomain = DEFAULT_EMAIL_DOMAIN } = {}) {
  const authUsers = await listAllAuthUsers(supabase);
  const demo = authUsers.filter((u) => isDemoAuthUser(u, emailDomain));
  // 표시가 하나만 있는 계정은 지우지 않고 알리기만 한다
  const halfMarked = authUsers.filter((u) => !isDemoAuthUser(u, emailDomain) && (isDemoEmail(u.email, emailDomain) || hasDemoFlag(u)));
  const ids = demo.map((u) => u.id);
  const empty = { users: [], inventories: [], items: [], posts: [] };
  if (!ids.length) return { demo, halfMarked, ids, rows: empty, related: {}, files: {} };

  const profiles = await selectIn(supabase, "users", "id, handle, nickname", "id", ids);
  const inventories = await selectIn(supabase, "inventories", "id, user_id, name, parent_inventory_id", "user_id", ids);
  const items = await selectIn(supabase, "items", "id, user_id", "user_id", ids);
  const posts = await selectIn(supabase, "inmyin_posts", "id, user_id", "user_id", ids);
  const itemIds = items.map((r) => r.id);
  const postIds = posts.map((r) => r.id);
  const targetIds = [...itemIds, ...postIds];
  const isDemo = (id) => ids.includes(id);

  // 데모를 가리키는 줄. 실제 유저가 데모에 누른 것도 여기 들어온다 — 대상이 사라지니 같이 지운다
  const byUserOrTarget = async (table, columns) => {
    const mine = await selectIn(supabase, table, columns, "user_id", ids);
    const onDemo = targetIds.length ? await selectIn(supabase, table, columns, "target_id", targetIds) : [];
    return dedupe([...mine, ...onDemo], (r) => `${r.user_id}|${r.target_type}|${r.target_id}|${r.id ?? ""}`);
  };
  const bookmarks = await byUserOrTarget("bookmarks", "user_id, target_type, target_id");
  const hearts = await byUserOrTarget("hearts", "user_id, target_type, target_id");
  const comments = await byUserOrTarget("comments", "id, user_id, target_type, target_id");
  const commentIds = comments.map((r) => r.id);
  const notifications = dedupe(
    [
      ...(await selectIn(supabase, "notifications", "id, user_id, actor_id", "user_id", ids)),
      ...(await selectIn(supabase, "notifications", "id, user_id, actor_id", "actor_id", ids)),
      ...(commentIds.length ? await selectIn(supabase, "notifications", "id, user_id, actor_id", "comment_id", commentIds) : []),
    ],
    (r) => r.id,
  );
  const follows = dedupe(
    [
      ...(await selectIn(supabase, "follows", "follower_id, following_id", "follower_id", ids)),
      ...(await selectIn(supabase, "follows", "follower_id, following_id", "following_id", ids)),
    ],
    (r) => `${r.follower_id}|${r.following_id}`,
  );
  const blocks = dedupe(
    [
      ...(await selectIn(supabase, "blocks", "blocker_id, blocked_id", "blocker_id", ids)),
      ...(await selectIn(supabase, "blocks", "blocker_id, blocked_id", "blocked_id", ids)),
    ],
    (r) => `${r.blocker_id}|${r.blocked_id}`,
  );
  const postItems = dedupe(
    [
      ...(postIds.length ? await selectIn(supabase, "post_items", "post_id, item_id", "post_id", postIds) : []),
      ...(itemIds.length ? await selectIn(supabase, "post_items", "post_id, item_id", "item_id", itemIds) : []),
    ],
    (r) => `${r.post_id}|${r.item_id}`,
  );

  const files = {};
  for (const bucket of BUCKETS) {
    files[bucket] = [];
    for (const id of ids) {
      for (let offset = 0; ; offset += 1000) {
        const list = must(await supabase.storage.from(bucket).list(id, { limit: 1000, offset }), `${bucket} 파일 목록`) ?? [];
        files[bucket].push(...list.filter((f) => f.id !== null && f.name).map((f) => `${id}/${f.name}`));
        if (list.length < 1000) break;
      }
    }
  }

  // 실제 유저 쪽에서 지워지는 줄 수 — 미리보기에 따로 보여 준다
  const realSide = {
    bookmarks: bookmarks.filter((r) => !isDemo(r.user_id)).length,
    hearts: hearts.filter((r) => !isDemo(r.user_id)).length,
    comments: comments.filter((r) => !isDemo(r.user_id)).length,
    follows: follows.filter((r) => !isDemo(r.follower_id) || !isDemo(r.following_id)).length,
    blocks: blocks.filter((r) => !isDemo(r.blocker_id) || !isDemo(r.blocked_id)).length,
    notifications: notifications.filter((r) => !isDemo(r.user_id)).length,
  };

  return {
    demo,
    halfMarked,
    ids,
    rows: { users: profiles, inventories, items, posts },
    related: { bookmarks, hearts, comments, notifications, follows, blocks, postItems },
    realSide,
    files,
  };
}

function dedupe(rows, keyOf) {
  const seen = new Map();
  for (const r of rows) seen.set(keyOf(r), r);
  return [...seen.values()];
}

export function describeCollection(c) {
  const lines = [];
  if (!c.demo.length) lines.push("데모 계정이 없습니다. 지울 것이 없습니다.");
  else {
    lines.push(`지울 데모 계정 ${c.demo.length}개:`);
    const handleOf = new Map(c.rows.users.map((u) => [u.id, `@${u.handle} ${u.nickname}`]));
    for (const u of c.demo) lines.push(`  ${u.email}  ${handleOf.get(u.id) ?? "(프로필 없음)"}  ${u.id}`);
    lines.push("");
    lines.push(`  인벤토리 ${c.rows.inventories.length} · 아이템 ${c.rows.items.length} · INMYIN 게시물 ${c.rows.posts.length}`);
    const r = c.related;
    lines.push(
      `  북마크 ${r.bookmarks.length} · 하트 ${r.hearts.length} · 댓글 ${r.comments.length} · 알림 ${r.notifications.length}` +
        ` · 팔로우 ${r.follows.length} · 차단 ${r.blocks.length} · 게시물-아이템 ${r.postItems.length}`,
    );
    const s = c.realSide;
    const realTotal = Object.values(s).reduce((a, b) => a + b, 0);
    lines.push(
      realTotal
        ? `  그중 실제 유저 쪽 줄(데모를 가리키는 것): 북마크 ${s.bookmarks} · 하트 ${s.hearts} · 댓글 ${s.comments} · 팔로우 ${s.follows} · 차단 ${s.blocks} · 알림 ${s.notifications}`
        : "  실제 유저 쪽 줄: 없음",
    );
    lines.push(`  저장소 파일: ${BUCKETS.map((b) => `${b} ${c.files[b]?.length ?? 0}`).join(" · ")}`);
  }
  if (c.halfMarked.length) {
    lines.push("");
    lines.push(`표시가 하나만 있어 지우지 않는 계정 ${c.halfMarked.length}개 (직접 확인 필요):`);
    for (const u of c.halfMarked) lines.push(`  ${u.email}  ${u.id}`);
  }
  return lines;
}

// 실제로 지운다. 물리 삭제다 — 데모는 실제 유저의 기록이 아니라서 deleted_at 대신 통째로 걷어낸다.
// 순서는 외래키를 따른다: 가리키는 쪽 먼저, 가리켜지는 쪽 나중
export async function clean(supabase, c, { log = console.log } = {}) {
  if (!c.ids.length) return;
  const { ids } = c;
  const r = c.related;
  const itemIds = c.rows.items.map((x) => x.id);
  const postIds = c.rows.posts.map((x) => x.id);
  const targetIds = [...itemIds, ...postIds];

  // 게시물 ↔ 아이템
  if (postIds.length) await deleteIn(supabase, "post_items", "post_id", postIds);
  if (itemIds.length) await deleteIn(supabase, "post_items", "item_id", itemIds);
  // 알림이 댓글을 가리키므로 알림 먼저. 하트 · 팔로우 · 댓글 트리거가 지우는 알림도 있지만 남은 것까지
  await deleteIn(supabase, "notifications", "id", r.notifications.map((x) => x.id));
  for (const table of ["bookmarks", "hearts", "comments"]) {
    await deleteIn(supabase, table, "user_id", ids);
    if (targetIds.length) await deleteIn(supabase, table, "target_id", targetIds);
  }
  // 댓글을 지우며 트리거가 새로 만든 알림이 있을 수 있어 한 번 더
  await deleteIn(supabase, "notifications", "user_id", ids);
  await deleteIn(supabase, "notifications", "actor_id", ids);
  await deleteIn(supabase, "follows", "follower_id", ids);
  await deleteIn(supabase, "follows", "following_id", ids);
  await deleteIn(supabase, "blocks", "blocker_id", ids);
  await deleteIn(supabase, "blocks", "blocked_id", ids);
  log("관계 지움");

  await deleteIn(supabase, "items", "user_id", ids);
  // 인벤토리끼리 담겨 있으면 부모를 먼저 풀어야 지울 수 있다
  const nested = c.rows.inventories.filter((x) => x.parent_inventory_id).map((x) => x.id);
  for (const part of chunks(nested)) {
    must(await supabase.from("inventories").update({ parent_inventory_id: null, parent_slot_index: null }).in("id", part), "인벤토리 풀기");
  }
  await deleteIn(supabase, "inventories", "user_id", ids);
  await deleteIn(supabase, "inmyin_posts", "user_id", ids);
  await deleteIn(supabase, "users", "id", ids);
  log("아이템 · 인벤토리 · 게시물 · 프로필 지움");

  for (const bucket of BUCKETS) {
    for (const part of chunks(c.files[bucket] ?? [], 500)) {
      must(await supabase.storage.from(bucket).remove(part), `${bucket} 파일 지우기`);
    }
  }
  log("저장소 파일 지움");

  for (const u of c.demo) must(await supabase.auth.admin.deleteUser(u.id), `${u.email} 계정 지우기`);
  log(`계정 ${c.demo.length}개 지움`);
}
