// 데모 스크립트 시험. 실제 DB 에 붙지 않는다 — 메모리 안의 가짜 Supabase 로 돈다.
//   node --test scripts/demo/

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { backgroundMask, whiteBackgroundCutout } from "./cutout.mjs";
import {
  clean,
  collectDemo,
  DEMO_FLAG,
  demoEmail,
  describeCollection,
  isDemoAuthUser,
  isDemoEmail,
  itemId,
  loadConfig,
  makePhotoPair,
  normalizeConfig,
  planSeed,
  seed,
  stableUuid,
} from "./lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────────────────────
// 가짜 Supabase — 이 스크립트가 쓰는 만큼만. 외래키 · 칸 번호 트리거 흉내 포함
// ─────────────────────────────────────────────────────────────

const FOREIGN_KEYS = [
  // [가리키는 표, 칸, 가리켜지는 표]
  ["inventories", "user_id", "users"],
  ["inventories", "parent_inventory_id", "inventories"],
  ["items", "user_id", "users"],
  ["items", "inventory_id", "inventories"],
  ["inmyin_posts", "user_id", "users"],
  ["post_items", "post_id", "inmyin_posts"],
  ["post_items", "item_id", "items"],
  ["bookmarks", "user_id", "users"],
  ["hearts", "user_id", "users"],
  ["comments", "user_id", "users"],
  ["notifications", "user_id", "users"],
  ["notifications", "actor_id", "users"],
  ["notifications", "comment_id", "comments"],
  ["follows", "follower_id", "users"],
  ["follows", "following_id", "users"],
  ["blocks", "blocker_id", "users"],
  ["blocks", "blocked_id", "users"],
];
const KEYS = {
  follows: ["follower_id", "following_id"],
  bookmarks: ["user_id", "target_type", "target_id"],
  hearts: ["user_id", "target_type", "target_id"],
};

function fakeSupabase() {
  const db = {
    users: [], inventories: [], items: [], inmyin_posts: [], post_items: [],
    bookmarks: [], hearts: [], comments: [], notifications: [], follows: [], blocks: [],
  };
  const authUsers = [];
  const files = new Map(); // "버킷/경로" → Buffer
  const calls = [];

  const fkError = (table, rows) => {
    for (const [from, column, to] of FOREIGN_KEYS) {
      if (to !== table) continue;
      const ids = new Set(rows.map((r) => r.id));
      if (db[from].some((r) => ids.has(r[column]) && !rows.includes(r))) return { message: `${from}.${column} 가 ${table} 을 가리킴`, code: "23503" };
    }
    return null;
  };

  const from = (table) => {
    const filters = [];
    const match = (row) => filters.every(([col, vals]) => vals.includes(row[col]));
    const chain = (run) => {
      const builder = {
        in: (col, vals) => (filters.push([col, vals]), builder),
        eq: (col, val) => (filters.push([col, [val]]), builder),
        then: (resolve, reject) => Promise.resolve().then(run).then(resolve, reject),
      };
      return builder;
    };
    return {
      select: () => chain(() => ({ data: db[table].filter(match).map((r) => ({ ...r })), error: null })),
      insert: (input) =>
        chain(() => {
          calls.push(["insert", table]);
          for (const row of [].concat(input)) {
            if (table === "users" && db.users.some((u) => u.handle === row.handle)) return { error: { message: "users_handle_key", code: "23505" } };
            const r = { deleted_at: null, ...row };
            if (table === "items") {
              // 칸 번호 트리거: 항상 맨 뒤
              const used = db.items.filter((i) => i.inventory_id === r.inventory_id && !i.deleted_at).map((i) => i.slot_index);
              r.slot_index = used.length ? Math.max(...used) + 1 : 0;
              if (!db.inventories.some((v) => v.id === r.inventory_id)) return { error: { message: "인벤토리 없음", code: "P0001" } };
            }
            db[table].push(r);
          }
          return { data: null, error: null };
        }),
      update: (fields) =>
        chain(() => {
          calls.push(["update", table]);
          for (const r of db[table].filter(match)) Object.assign(r, fields);
          return { data: null, error: null };
        }),
      upsert: (input, { ignoreDuplicates } = {}) =>
        chain(() => {
          calls.push(["upsert", table]);
          assert.ok(ignoreDuplicates, "관계는 중복을 건너뛰어야 함");
          for (const row of input) {
            const key = KEYS[table];
            if (!db[table].some((r) => key.every((k) => r[k] === row[k]))) db[table].push({ ...row });
          }
          return { data: null, error: null };
        }),
      delete: () =>
        chain(() => {
          calls.push(["delete", table]);
          const doomed = db[table].filter(match);
          const error = fkError(table, doomed);
          if (error) return { error };
          db[table] = db[table].filter((r) => !doomed.includes(r));
          return { data: null, error: null };
        }),
    };
  };

  const storage = {
    from: (bucket) => ({
      upload: async (p, buffer, opts) => {
        calls.push(["upload", bucket]);
        if (files.has(`${bucket}/${p}`) && !opts?.upsert) return { error: { message: "exists" } };
        files.set(`${bucket}/${p}`, buffer);
        return { data: { path: p }, error: null };
      },
      list: async (prefix, { limit = 100, offset = 0 } = {}) => {
        const names = [...files.keys()].filter((k) => k.startsWith(`${bucket}/${prefix}/`)).map((k) => k.slice(bucket.length + prefix.length + 2));
        return { data: names.slice(offset, offset + limit).map((name) => ({ name, id: name })), error: null };
      },
      remove: async (paths) => {
        calls.push(["remove", bucket]);
        for (const p of paths) files.delete(`${bucket}/${p}`);
        return { data: null, error: null };
      },
      getPublicUrl: (p) => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${p}` } }),
    }),
  };

  const auth = {
    admin: {
      listUsers: async ({ page, perPage }) => ({ data: { users: authUsers.slice((page - 1) * perPage, page * perPage) }, error: null }),
      createUser: async ({ email, app_metadata }) => {
        calls.push(["createUser", email]);
        const user = { id: randomUUID(), email, app_metadata: { provider: "email", ...app_metadata } };
        authUsers.push(user);
        return { data: { user }, error: null };
      },
      deleteUser: async (id) => {
        calls.push(["deleteUser", id]);
        if (db.users.some((u) => u.id === id)) return { error: { message: "public.users 가 가리킴", code: "23503" } };
        authUsers.splice(authUsers.findIndex((u) => u.id === id), 1);
        return { data: null, error: null };
      },
    },
  };

  return { client: { from, storage, auth }, db, authUsers, files, calls };
}

// 흰 바탕 + 가운데 색 네모(+ 그 안에 흰 구멍) 사진
async function sampleImage(size = 900, color = { r: 220, g: 60, b: 90 }) {
  const square = await sharp({ create: { width: size / 3, height: size / 3, channels: 3, background: color } })
    .composite([{ input: { create: { width: size / 15, height: size / 15, channels: 3, background: "#ffffff" } }, gravity: "center" }])
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 3, background: "#fbfbfb" } })
    .composite([{ input: square, gravity: "center" }])
    .png()
    .toBuffer();
}

async function memoryConfig() {
  const img = await sampleImage();
  const user = (no, handle, items, extra = {}) => ({
    no,
    handle,
    nickname: handle,
    bio: null,
    plan: "basic",
    email: demoEmail(handle),
    avatar: img,
    inventories: [
      {
        key: "main",
        id: stableUuid(`inventory:${handle}:main`),
        name: `${handle} 인벤`,
        category: null,
        tags: ["a"],
        slotCount: 25,
        isPublic: true,
        image: img,
        sortOrder: 0,
        items: items.map((code) => ({ code, id: itemId(code), name: code, description: "설명", tag: "a", quantity: 1, acquiredNote: null, isPublic: true, image: img, cutout: null })),
      },
    ],
    follows: [],
    bookmarks: [],
    hearts: [],
    ...extra,
  });
  return {
    imageDir: "/",
    emailDomain: "demo.inmyin.invalid",
    users: [
      user(1, "demo_one", ["1-01", "1-02", "1-03"], { follows: ["demo_two"], bookmarks: ["2-01"], hearts: ["2-01", "1-01"] }),
      user(2, "demo_two", ["2-01"], { follows: ["demo_one"] }),
    ],
  };
}

const quiet = { log: () => {} };

// ─────────────────────────────────────────────────────────────

test("고정 id 는 같은 이름이면 같고, UUID v5 꼴이다", () => {
  assert.equal(stableUuid("item:1-01"), stableUuid("item:1-01"));
  assert.notEqual(stableUuid("item:1-01"), stableUuid("item:1-02"));
  assert.match(stableUuid("x"), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("데모 표시: 이메일 규칙과 app_metadata 둘 다 있어야 데모", () => {
  const flag = { [DEMO_FLAG]: true };
  assert.ok(isDemoEmail("demo+momo_pouch@demo.inmyin.invalid"));
  assert.ok(!isDemoEmail("dangnee@gmail.com"));
  assert.ok(!isDemoEmail("demo+momo@demo.inmyin.invalid.evil.com"));
  assert.ok(!isDemoEmail("xdemo+momo@demo.inmyin.invalid"));
  assert.ok(!isDemoEmail("demo+momo@gmail.com"));
  assert.ok(isDemoAuthUser({ email: "demo+momo@demo.inmyin.invalid", app_metadata: flag }));
  assert.ok(!isDemoAuthUser({ email: "demo+momo@demo.inmyin.invalid", app_metadata: {} }), "표시 없는 계정");
  assert.ok(!isDemoAuthUser({ email: "someone@gmail.com", app_metadata: flag }), "이메일이 다른 계정");
  assert.ok(!isDemoAuthUser({ email: "demo+momo@demo.inmyin.invalid", app_metadata: { [DEMO_FLAG]: "true" } }), "글자 true 는 아님");
});

test("예시 설정은 오류 없이 읽힌다", async () => {
  const { errors, config } = await loadConfig(path.join(here, "example.json"));
  assert.deepEqual(errors, []);
  assert.equal(config.users.length, 2);
  assert.equal(config.users[0].email, "demo+momo_pouch@demo.inmyin.invalid");
  assert.deepEqual(config.users[1].follows, ["momo_pouch"], "아이디로 가리킨 팔로우");
  assert.deepEqual(config.users[0].follows, ["juno_desk"], "번호로 가리킨 팔로우");
  assert.equal(config.users[1].inventories[0].slotCount, 25, "칸 수 기본값 = basic 플랜");
  assert.ok(config.users[0].inventories[0].items[0].image.endsWith("1_모모/hf_20261020_000001_pouch-example.png"));
  assert.ok(!config.users[0].inventories[0].items[0].image.startsWith("~"), "~ 를 홈 폴더로 바꿈");
});

test("설정 오류를 한 번에 모아 알려 준다", () => {
  const { errors, warnings } = normalizeConfig(
    {
      users: [
        {
          no: 1,
          handle: "Bad Handle",
          nickname: "가",
          inventories: [{ name: "인벤", tags: ["a"], slotCount: 2, items: [
            { code: "1-01", name: "가", description: "설명", image: "a.png", tag: "새태그" },
            { code: "1-01", name: "나", description: "", image: "b.png" },
            { code: "1-03", name: "다", description: "설명", image: "c.png" },
          ] }],
          follows: [1, 9],
          bookmarks: ["9-99"],
        },
      ],
    },
    "/tmp",
  );
  const all = errors.join("\n");
  assert.match(all, /handle/);
  assert.match(all, /code 1-01 가 겹칩니다/);
  assert.match(all, /description 이 비어/);
  assert.match(all, /칸 수 2 를 넘습니다/);
  assert.match(all, /자기 자신은 팔로우/);
  assert.match(all, /follows 의 9/);
  assert.match(all, /9-99/);
  assert.ok(warnings.some((w) => w.includes("새태그")), "아이템 태그가 인벤토리 태그에 더해짐");
});

test("남의 비공개 아이템은 북마크 · 하트로 가리킬 수 없다", () => {
  const base = (no, handle, isPublic, extra = {}) => ({
    no, handle, nickname: handle,
    inventories: [{ name: "인벤", items: [{ code: `${no}-01`, name: "가", description: "설명", image: "a.png", isPublic }] }],
    ...extra,
  });
  const { errors } = normalizeConfig({ users: [base(1, "aaa", false), base(2, "bbb", true, { hearts: ["1-01"] })] }, "/tmp");
  assert.match(errors.join("\n"), /비공개/);
});

test("흰 바탕 지우기: 바탕은 투명, 물건과 그 안의 흰 구멍은 남는다", async () => {
  const input = await sampleImage(300);
  const png = await whiteBackgroundCutout(input);
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  const alphaAt = (x, y) => data[(y * info.width + x) * 4 + 3];
  assert.equal(alphaAt(5, 5), 0, "모서리 바탕");
  assert.equal(alphaAt(60, 150), 0, "물건 옆 바탕");
  assert.equal(alphaAt(120, 120), 255, "물건");
  assert.equal(alphaAt(150, 150), 255, "물건 안의 흰 구멍은 남음");
  // 세 줄마다 어긋나던 버그(1채널 알파가 3채널로 돌아옴) 되풀이 방지: 바탕 줄은 모두 투명
  for (let y = 0; y < 90; y++) assert.equal(alphaAt(150, y), 0, `${y}번째 줄`);
});

test("흰 바탕 지우기: 줄무늬 잡티가 있는 바탕도 지운다", () => {
  const w = 60, h = 60;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const inside = x >= 20 && x < 40 && y >= 20 && y < 40;
    const v = inside ? 40 : 250 - (y % 3 === 0 ? 1 : 0);
    rgba[i] = rgba[i + 1] = rgba[i + 2] = v;
    rgba[i + 3] = 255;
  }
  const mask = backgroundMask(rgba, w, h);
  assert.equal(mask[0], 1);
  assert.equal(mask[30 * w + 30], 0);
  assert.equal([...mask].filter((m) => m === 1).length, w * h - 400);
});

test("사진 한 쌍: 앱과 같이 썸네일 640 · 원본 1280 webp, 작은 사진은 키우지 않음", async () => {
  const big = await sampleImage(1500);
  const pair = await makePhotoPair({ image: big, cutout: null });
  assert.equal(pair.thumbnail.width, 640);
  assert.equal(pair.raw.width, 1280);
  assert.equal(pair.thumbnail.contentType, "image/webp");
  assert.equal(pair.background, "그대로");
  const small = await makePhotoPair({ image: await sampleImage(300), cutout: null }, { cutoutMode: true });
  assert.equal(small.raw.width, 300);
  assert.equal(small.background, "흰 배경 지움");
  const meta = await sharp(small.thumbnail.buffer).metadata();
  assert.ok(meta.hasAlpha, "누끼 썸네일은 투명을 담는다");
  const off = await makePhotoPair({ image: await sampleImage(300), cutout: false }, { cutoutMode: true });
  assert.equal(off.background, "그대로", "cutout: false 면 배경 그대로");
});

test("마른 실행은 클라이언트 없이 돌고 합계를 낸다", async () => {
  const { lines, problems } = await planSeed(await memoryConfig(), { cutoutMode: true });
  assert.deepEqual(problems, []);
  assert.match(lines.at(-1), /유저 2 · 인벤토리 2 · 아이템 4 · 팔로우 2 · 북마크 1 · 하트 2/);
});

test("넣기: 계정 · 프로필 · 인벤토리 · 아이템(설정 순서대로 칸) · 관계 · 사진 경로", async () => {
  const fake = fakeSupabase();
  const config = await memoryConfig();
  const { userIds } = await seed(fake.client, config, quiet);

  assert.equal(fake.authUsers.length, 2);
  assert.ok(fake.authUsers.every((u) => isDemoAuthUser(u)), "두 표시가 모두 붙음");
  assert.equal(fake.db.users.length, 2);
  assert.equal(fake.db.users[0].provider, "email");
  assert.equal(fake.db.inventories.length, 2);
  const one = userIds.demo_one;
  const items = fake.db.items.filter((i) => i.user_id === one).sort((a, b) => a.slot_index - b.slot_index);
  assert.deepEqual(items.map((i) => i.name), ["1-01", "1-02", "1-03"]);
  assert.deepEqual(items.map((i) => i.slot_index), [0, 1, 2]);
  assert.equal(items[0].id, itemId("1-01"));
  assert.equal(items[0].image_url, `https://example.supabase.co/storage/v1/object/public/items/${one}/${itemId("1-01")}.webp`);
  assert.equal(items[0].raw_image_url, `${one}/${itemId("1-01")}.webp`, "원본은 주소가 아니라 경로");
  assert.ok(fake.files.has(`items-raw/${one}/${itemId("1-01")}.webp`));
  assert.match(fake.db.users.find((u) => u.id === one).avatar_url, new RegExp(`/avatars/${one}/[0-9a-f]{16}\\.webp$`));
  assert.equal(fake.db.follows.length, 2);
  assert.equal(fake.db.bookmarks.length, 1);
  assert.equal(fake.db.hearts.length, 2);
});

test("다시 돌려도 중복이 생기지 않는다 (글자는 갱신, 사진은 그대로)", async () => {
  const fake = fakeSupabase();
  const config = await memoryConfig();
  await seed(fake.client, config, quiet);
  const uploadsBefore = fake.calls.filter((c) => c[0] === "upload").length;
  config.users[0].inventories[0].items[1].name = "바뀐 이름";
  await seed(fake.client, config, quiet);

  assert.equal(fake.authUsers.length, 2);
  assert.equal(fake.db.users.length, 2);
  assert.equal(fake.db.inventories.length, 2);
  assert.equal(fake.db.items.length, 4);
  assert.equal(fake.db.follows.length, 2);
  assert.equal(fake.db.hearts.length, 2);
  assert.equal(fake.db.items.find((i) => i.id === itemId("1-02")).name, "바뀐 이름");
  assert.equal(fake.db.items.find((i) => i.id === itemId("1-02")).slot_index, 1, "칸 번호 그대로");
  assert.equal(fake.calls.filter((c) => c[0] === "upload").length, uploadsBefore, "사진은 다시 올리지 않음");
});

test("넣기는 실제 계정과 겹치면 아무것도 쓰기 전에 멈춘다", async () => {
  const config = await memoryConfig();

  const sameEmail = fakeSupabase();
  sameEmail.authUsers.push({ id: randomUUID(), email: demoEmail("demo_one"), app_metadata: {} });
  await assert.rejects(seed(sameEmail.client, config, quiet), /데모 표시.*없습니다/);
  assert.equal(sameEmail.calls.length, 0);

  const sameHandle = fakeSupabase();
  const realId = randomUUID();
  sameHandle.authUsers.push({ id: realId, email: "real@gmail.com", app_metadata: {} });
  sameHandle.db.users.push({ id: realId, handle: "demo_two", nickname: "진짜" });
  await assert.rejects(seed(sameHandle.client, config, quiet), /실제 유저가 쓰고 있습니다/);
  assert.equal(sameHandle.calls.length, 0);
});

test("지우기: 데모만 찾아 지우고, 실제 유저의 것은 데모를 가리키는 줄만 지운다", async () => {
  const fake = fakeSupabase();
  await seed(fake.client, await memoryConfig(), quiet);

  // 실제 유저 둘: 데모를 팔로우 · 하트 · 북마크한 사람, 아무 관계 없는 사람
  const real = { id: randomUUID(), email: "real@gmail.com", app_metadata: { provider: "email" } };
  const other = { id: randomUUID(), email: "demo+fake@demo.inmyin.invalid", app_metadata: {} }; // 표시가 하나뿐
  fake.authUsers.push(real, other);
  fake.db.users.push({ id: real.id, handle: "real_user", nickname: "진짜" }, { id: other.id, handle: "half_marked", nickname: "반쪽" });
  const realInv = randomUUID();
  const realItem = randomUUID();
  fake.db.inventories.push({ id: realInv, user_id: real.id, name: "진짜 인벤", deleted_at: null, parent_inventory_id: null });
  fake.db.items.push({ id: realItem, user_id: real.id, inventory_id: realInv, slot_index: 0, deleted_at: null });
  fake.files.set(`items/${real.id}/${realItem}.webp`, Buffer.from("x"));
  const demoId = fake.authUsers[0].id;
  fake.db.follows.push({ follower_id: real.id, following_id: demoId }, { follower_id: real.id, following_id: other.id });
  fake.db.hearts.push({ user_id: real.id, target_type: "item", target_id: itemId("1-01") }, { user_id: real.id, target_type: "item", target_id: realItem });
  fake.db.bookmarks.push({ user_id: demoId, target_type: "item", target_id: realItem });
  fake.db.notifications.push({ id: randomUUID(), user_id: demoId, actor_id: real.id }, { id: randomUUID(), user_id: real.id, actor_id: other.id });

  const c = await collectDemo(fake.client);
  assert.equal(c.ids.length, 2);
  assert.ok(!c.ids.includes(real.id) && !c.ids.includes(other.id));
  assert.equal(c.halfMarked.length, 1);
  assert.equal(c.realSide.follows, 1);
  assert.equal(c.realSide.hearts, 1);
  const text = describeCollection(c).join("\n");
  assert.match(text, /지울 데모 계정 2개/);
  assert.match(text, /표시가 하나만 있어 지우지 않는 계정 1개/);
  assert.equal(fake.calls.filter((x) => ["delete", "remove", "deleteUser"].includes(x[0])).length, 0, "미리보기는 읽기만");

  await clean(fake.client, c, quiet);

  // 데모는 흔적 없이
  const demoIds = new Set(c.ids);
  assert.equal(fake.authUsers.filter((u) => demoIds.has(u.id)).length, 0);
  assert.equal(fake.db.users.filter((u) => demoIds.has(u.id)).length, 0);
  assert.equal(fake.db.items.filter((u) => demoIds.has(u.user_id)).length, 0);
  assert.equal(fake.db.inventories.filter((u) => demoIds.has(u.user_id)).length, 0);
  assert.equal([...fake.files.keys()].filter((k) => [...demoIds].some((id) => k.includes(id))).length, 0);
  // 실제 유저 것은 그대로
  assert.ok(fake.authUsers.some((u) => u.id === real.id) && fake.authUsers.some((u) => u.id === other.id));
  assert.equal(fake.db.users.length, 2);
  assert.equal(fake.db.items.length, 1);
  assert.equal(fake.db.inventories.length, 1);
  assert.ok(fake.files.has(`items/${real.id}/${realItem}.webp`));
  assert.deepEqual(fake.db.follows, [{ follower_id: real.id, following_id: other.id }]);
  assert.deepEqual(fake.db.hearts, [{ user_id: real.id, target_type: "item", target_id: realItem }]);
  assert.equal(fake.db.bookmarks.length, 0, "데모가 실제 아이템에 누른 북마크도 지움");
  assert.equal(fake.db.notifications.length, 1, "실제 유저끼리의 알림은 남음");
});

test("지우기: 데모가 없으면 아무것도 안 한다", async () => {
  const fake = fakeSupabase();
  fake.authUsers.push({ id: randomUUID(), email: "real@gmail.com", app_metadata: {} });
  const c = await collectDemo(fake.client);
  assert.equal(c.ids.length, 0);
  await clean(fake.client, c, quiet);
  assert.equal(fake.calls.length, 0);
});
