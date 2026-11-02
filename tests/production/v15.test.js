import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { initial, validate, mergeStates } from "../../src/storage/state.js";
import {
  migrateAcademy,
  startScience,
  submitScience,
  advanceScience,
  awardPartner,
} from "../../src/academy.js";
import {
  partners,
  partnerLine,
  states,
  partnerArt,
} from "../../src/partners.js";
import { APP_VERSION } from "../../src/release.js";
import { updateGuideHTML } from "../../src/update-guide.js";
import { historyRows } from "../../src/content/history.js";
test("all partners keep their original image bytes and receive ten individually authored extra poses", () => {
  const plan = JSON.parse(
    readFileSync("docs/partner-extra-poses-v1.5.json", "utf8"),
  );
  assert.equal(plan.poses.length, partners.length * 10);
  assert.equal(
    new Set(plan.poses.map((p) => p.action)).size,
    plan.poses.length,
  );
  for (const p of partners) {
    const items = plan.poses.filter((x) => x.character === p.id);
    assert.equal(items.length, 10, p.id);
    assert.equal(new Set(items.map((x) => x.state)).size, 10);
    for (const x of items) assert.ok(x.file.endsWith(x.state + "-v2.webp"));
  }
  for (const [path, expected] of Object.entries(plan.originalGitBlobHashes)) {
    const bytes = readFileSync(path);
    const hash = createHash("sha1")
      .update(`blob ${bytes.length}\0`)
      .update(bytes)
      .digest("hex");
    assert.equal(hash, expected, path + " original changed");
  }
});
function finish(d) {
  const s = startScience(d, "biology", 0, new Date("2026-11-02T06:00:00Z"));
  while (!s.completed) {
    const t = { session: s.id, index: s.index };
    submitScience(d, "biology", t, s.questions[s.index].answer);
    advanceScience(d, "biology", t);
  }
  return s;
}
test("black egg is next after any prior roster state, old unlocks and awards remain, and it is not a starter", () => {
  for (const existing of [
    ["ling", "gu", "kirby"],
    partners.filter((p) => p.id !== "blackegg").map((p) => p.id),
  ]) {
    const d = initial();
    migrateAcademy(d);
    assert.ok(!d.academy.unlocked.includes("blackegg"));
    d.academy.unlocked = [...existing];
    const before = structuredClone(d.academy.unlocked);
    const s = finish(d);
    assert.equal(s.partnerReward.partner, "blackegg");
    assert.deepEqual(d.academy.unlocked, [...before, "blackegg"]);
    const old = structuredClone(d.academy.rewards);
    awardPartner(d, s, "biology");
    assert.deepEqual(d.academy.rewards, old);
    validate(d);
    const merged = mergeStates(d, structuredClone(d));
    assert.equal(
      merged.academy.unlocked.filter((x) => x === "blackegg").length,
      1,
    );
    validate(merged);
  }
});
test("black egg covers every feedback event with valid local pose references and a personal voice", () => {
  for (const state of states)
    assert.ok(partnerArt("blackegg", state).includes("/blackegg/"));
  for (const event of [
    "greet",
    "thinking",
    "hint_light",
    "hint_step",
    "correct",
    "excellent",
    "wrong",
    "retry",
    "complete",
    "unlock",
    "bonus",
    "solution",
    "end",
    "streak3",
    "streak5",
  ]) {
    const line = partnerLine("blackegg", event);
    assert.ok(line.startsWith("黑色蛋仔："));
    assert.ok(!line.includes("undefined"));
  }
  assert.notEqual(partnerLine("blackegg", "greet"), partnerLine("gu", "greet"));
});
test("all 61 illustrations have unique character pairs and distinct scene actions with the requested cameo roster", () => {
  const plan = JSON.parse(
    readFileSync("docs/history-art-v1.5-plan.json", "utf8"),
  );
  assert.equal(plan.images.length, 61);
  assert.deepEqual(
    plan.images.map((i) => i.id).sort(),
    historyRows.map((r) => r.id).sort(),
  );
  const pairs = new Set(),
    actions = new Set(),
    cast = new Set();
  for (const item of plan.images) {
    assert.equal(item.actors.length, 2);
    const ids = item.actors.map((a) => a.id);
    assert.equal(new Set(ids).size, 2);
    const pair = ids.sort().join("+");
    assert.ok(!pairs.has(pair));
    pairs.add(pair);
    for (const a of item.actors) {
      cast.add(a.id);
      assert.ok(!actions.has(a.action));
      actions.add(a.action);
      assert.ok(a.action.length > 30);
    }
  }
  for (const id of [
    "blackegg",
    "kirby",
    "gen",
    "sonic",
    "huan",
    "ling",
    "gu",
    "lu",
    "mario",
    "yoshi",
    "prism",
    "comet",
    "moss",
    "bell",
    "pebble",
  ])
    assert.ok(cast.has(id), id);
});
test("home update status is compact and matches release", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(APP_VERSION, pkg.version);
  const html = updateGuideHTML();
  assert.ok(html.includes(APP_VERSION));
  assert.ok(html.includes("自动检查更新"));
  assert.ok(!html.includes("<ol>"));
  assert.ok(!html.includes("checkForUpdate"));
});
