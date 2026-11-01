import test from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  begin,
  help,
  advance,
  validate,
  mergeStates,
} from "../../src/storage/state.js";
import {
  migrateAcademy,
  startScience,
  submitScience,
  scienceHelp,
  advanceScience,
  awardPartner,
  selectPartner,
} from "../../src/academy.js";
import {
  partners,
  states,
  eventStates,
  chooseEffect,
  partnerLine,
  partnerArt,
} from "../../src/partners.js";
import { packs, scienceQuestions } from "../../src/content/science.js";
import {
  makeReport,
  validateReport,
  mergeReports,
  emptyReport,
  summarize,
} from "../../src/reports.js";
const date = (d) =>
  new Date(`2026-11-${String(d + 1).padStart(2, "0")}T06:00:00Z`);
function finishScience(d, sub, day, stage = 0) {
  const s = startScience(d, sub, stage, date(day));
  while (!s.completed) {
    const token = { session: s.id, index: s.index },
      q = s.questions[s.index];
    scienceHelp(d, sub, token, 1);
    assert.equal(submitScience(d, sub, token, q.answer).correct, true);
    assert.equal(advanceScience(d, sub, token), true);
  }
  return s;
}
test("migration preserves old math questions, drafts, rewards, layout and clips; old seven slots become original partners once", () => {
  const d = initial(),
    s = begin(d, 0, date(0));
  s.records[0].draft = [{ points: [[0.1, 0.2]], erase: false }];
  d.inventory.flowers = 2;
  const before = structuredClone(d);
  migrateAcademy(d, true);
  const first = structuredClone(d.academy);
  migrateAcademy(d, true);
  assert.deepEqual(d.academy, first);
  for (const k of [
    "inventory",
    "layout",
    "layoutHistory",
    "ledger",
    "seen",
    "clip",
  ])
    assert.deepEqual(d[k], before[k]);
  assert.deepEqual(s.questions, before.sessions[s.id].questions);
  assert.deepEqual(s.records, before.sessions[s.id].records);
  assert.equal(d.academy.unlocked.length, 3);
  assert.equal(validate(d), d);
});
test("14 science day groups plus optional groups contain 84 distinct authored questions, no silent day-eight repeats", () => {
  const d = initial();
  migrateAcademy(d, false);
  const seen = new Set(),
    inventory = structuredClone(d.inventory);
  for (let day = 0; day < 7; day++)
    for (const sub of ["biology", "geography"])
      for (const stage of [0, 1]) {
        const s = finishScience(d, sub, day, stage);
        assert.equal(s.questions.length, stage ? 2 : 4);
        for (const q of s.questions) {
          assert.ok(!seen.has(q.id));
          seen.add(q.id);
          assert.ok(q.choices.includes(q.answer));
          assert.ok(q.hint && q.solution && q.visual);
        }
        assert.equal(validate(d), d);
        const count = Object.keys(d.academy.rewards).length;
        awardPartner(d, s, sub);
        assert.equal(Object.keys(d.academy.rewards).length, count);
      }
  assert.equal(seen.size, 84);
  assert.equal(d.academy.unlocked.length, partners.length);
  assert.equal(d.academy.stars, 28 - (partners.length - 3));
  assert.deepEqual(d.inventory, inventory);
  assert.throws(() => startScience(d, "biology", 0, date(7)), /七次/);
  assert.throws(() => startScience(d, "geography", 0, date(7)), /七次/);
});
test("math retains seven independently generated days and v1 difficulty; new rewards do not add blocks", () => {
  const d = initial();
  migrateAcademy(d, false);
  const before = structuredClone(d.inventory),
    seen = new Set();
  for (let day = 0; day < 7; day++) {
    const s = begin(d, 0, date(day));
    assert.equal(s.questions.length, 5);
    while (!s.completed) {
      const q = s.questions[s.index],
        t = { session: s.id, index: s.index, question: q.instanceId };
      assert.equal(q.templateVersion, 1);
      assert.ok(!seen.has(q.contentFingerprint));
      seen.add(q.contentFingerprint);
      help(d, t, 3, true);
      advance(d, t);
    }
    assert.ok(s.partnerReward.partner || s.partnerReward.stars);
    assert.equal(validate(d), d);
  }
  assert.equal(seen.size, 35);
  assert.deepEqual(d.inventory, before);
  assert.equal(Object.keys(d.academy.rewards).length, 7);
});
test("subject sessions resume across dates independently and keep the selected partner for a round", () => {
  const d = initial();
  migrateAcademy(d, false);
  selectPartner(d, "gu");
  const b = startScience(d, "biology", 0, date(0));
  selectPartner(d, "kirby");
  const g = startScience(d, "geography", 0, date(0));
  assert.equal(b.partnerId, "gu");
  assert.equal(g.partnerId, "kirby");
  assert.equal(startScience(d, "biology", 0, date(3)).id, b.id);
  assert.equal(startScience(d, "geography", 0, date(3)).id, g.id);
  assert.equal(d.active, null);
  assert.throws(() => selectPartner(d, "pebble"), /没有解锁/);
});
test("science errors, hints, studying and deferred records stay honest; repeated clicks cannot advance twice", () => {
  const d = initial();
  migrateAcademy(d, false);
  const s = startScience(d, "biology", 0, date(0)),
    token = { session: s.id, index: 0 };
  const wrong = s.questions[0].choices.find((c) => c !== s.questions[0].answer);
  submitScience(d, "biology", token, wrong);
  scienceHelp(d, "biology", token, 3);
  assert.equal(s.records[0].errors, 1);
  advanceScience(d, "biology", token);
  assert.equal(s.records[0].mode, "studied");
  assert.equal(advanceScience(d, "biology", token), false);
  const t = { session: s.id, index: 1 };
  advanceScience(d, "biology", t, true);
  assert.equal(s.records[1].mode, "deferred");
  assert.equal(validate(d), d);
});
test("every original partner covers 15 semantic states, four event variants avoid the previous three and personalities differ", () => {
  const d = initial();
  migrateAcademy(d, true);
  for (const p of partners) {
    for (const state of states) {
      const svg = partnerArt(p.id, state);
      assert.match(svg, /<svg/);
      assert.ok(svg.includes(`state-${state}`));
    }
    for (const event of Object.keys(eventStates)) {
      const history = [];
      for (let n = 0; n < 12; n++) {
        const fx = chooseEffect(d, p.id, event);
        assert.equal(fx.state, eventStates[event]);
        assert.ok(!history.slice(-3).includes(fx.variant));
        history.push(fx.variant);
      }
    }
  }
  const lines = partners
    .slice(0, 3)
    .concat(partners[6])
    .map((p) => partnerLine(p.id, "hint_light", 0, "植物细胞通常有细胞壁。"));
  assert.equal(new Set(lines).size, 4);
  assert.ok(lines.every((t) => t.includes("植物细胞通常有细胞壁。")));
  assert.equal(validate(d), d);
});
test("legacy v1 parent reports merge with v2 math and science without double counting", () => {
  const d = initial(),
    s = begin(d, 0, date(0));
  help(
    d,
    { session: s.id, index: 0, question: s.questions[0].instanceId },
    3,
    true,
  );
  advance(d, { session: s.id, index: 0, question: s.questions[0].instanceId });
  const before = makeReport(d);
  const legacy = structuredClone(before);
  legacy.version = 1;
  legacy.records.forEach((r) => delete r.subject);
  migrateAcademy(d, true);
  finishScience(d, "biology", 0);
  finishScience(d, "geography", 0);
  const all = makeReport(d);
  const merged = mergeReports(legacy, all);
  assert.equal(merged.records.length, 9);
  assert.equal(summarize(merged, "biology").n, 4);
  assert.equal(summarize(merged, "geography").n, 4);
  assert.equal(summarize(merged, "math").n, 1);
  assert.equal(mergeReports(merged, legacy).records.length, 9);
  assert.equal(validateReport(legacy).version, 2);
  assert.ok(!/draft|layout|partnerId/.test(JSON.stringify(all)));
});
test("backup merge preserves current layout and adds science/partners once; malformed questions or rewards rejected", () => {
  const d = initial();
  migrateAcademy(d, true);
  const incoming = structuredClone(d);
  finishScience(incoming, "biology", 0);
  const merged = mergeStates(d, incoming);
  assert.equal(Object.keys(merged.academy.science.sessions).length, 1);
  assert.deepEqual(merged.layout, d.layout);
  assert.equal(
    mergeStates(merged, incoming).academy.unlocked.length,
    merged.academy.unlocked.length,
  );
  const bad = structuredClone(incoming);
  Object.values(bad.academy.science.sessions)[0].questions[0].answer =
    "invented";
  assert.throws(() => validate(bad), /内容不一致/);
  const badReward = structuredClone(incoming);
  Object.values(badReward.academy.rewards)[0].session = "fake";
  assert.throws(() => validate(badReward), /奖励/);
});

test("positive events stay semantic: hinted/retried ordinary, independent key question big, third/fifth consecutive special", async () => {
  const { positiveEvent } = await import("../../src/partners.js");
  const rows = Array.from({ length: 5 }, () => ({ mode: "independent" }));
  assert.equal(positiveEvent(rows, 0, true), "excellent");
  assert.equal(positiveEvent(rows, 1, false), "correct");
  assert.equal(positiveEvent(rows, 2), "streak3");
  assert.equal(positiveEvent(rows, 4), "streak5");
  rows[4].mode = "helped";
  assert.equal(positiveEvent(rows, 4, true), "correct");
  rows[3].mode = "retried";
  assert.equal(positiveEvent(rows, 3, true), "correct");
});
