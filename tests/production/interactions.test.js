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
} from "../../src/academy.js";
import { partners } from "../../src/partners.js";
import { scienceQuestions } from "../../src/content/science.js";
import {
  diagramQuestion,
  diagramParts,
  guideTarget,
  scienceVisual,
} from "../../src/science-visuals.js";
import { hemispheres, illumination } from "../../src/earth-lab.js";
import {
  audioPreferences,
  setAudioPreferences,
  installedSoundCount,
  playPartnerSound,
} from "../../src/partner-audio.js";
test("original audio remains honestly absent and muted without supplied clips", async () => {
  assert.equal(audioPreferences().enabled, false);
  assert.equal(installedSoundCount(), 0);
  assert.equal(await playPartnerSound("ling", "greet"), "muted");
  setAudioPreferences({ enabled: true, volume: 0.4 });
  assert.equal(await playPartnerSound("ling", "greet"), "not-installed");
  setAudioPreferences({ enabled: false, volume: 0.5 });
});

test("authorized eight-to-three reset preserves old sessions/rewards and does not recur or re-unlock old backups", () => {
  const d = initial();
  migrateAcademy(d);
  d.academy.unlocked = partners.slice(0, 7).map((p) => p.id);
  d.academy.selected = "lu";
  const s = startScience(d, "biology", 0, new Date("2026-11-01T06:00:00Z"));
  while (!s.completed) {
    const t = { session: s.id, index: s.index };
    submitScience(d, "biology", t, s.questions[s.index].answer);
    advanceScience(d, "biology", t);
  }
  assert.equal(d.academy.unlocked.length, 8);
  delete d.academy.rosterVersion;
  const before = structuredClone(d);
  migrateAcademy(d);
  validate(d);
  assert.deepEqual(d.academy.unlocked, ["ling", "gu", "kirby"]);
  for (const field of ["sessions", "inventory", "layout", "clip", "ledger"])
    assert.deepEqual(d[field], before[field]);
  for (const field of ["science", "rewards", "stars", "effects"])
    assert.deepEqual(d.academy[field], before.academy[field]);
  assert.equal(d.academy.selected, "ling");
  const next = startScience(d, "biology", 0, new Date("2026-11-02T06:00:00Z"));
  while (!next.completed) {
    const t = { session: next.id, index: next.index };
    submitScience(d, "biology", t, next.questions[next.index].answer);
    advanceScience(d, "biology", t);
  }
  assert.equal(next.partnerReward.partner, "blackegg");
  migrateAcademy(d);
  assert.deepEqual(d.academy.unlocked, ["ling", "gu", "kirby", "blackegg"]);
  const merged = mergeStates(d, before);
  assert.deepEqual(merged.academy.unlocked, d.academy.unlocked);
  validate(merged);
});
test("all 84 guide targets belong to the right presented diagram without changing saved question content", () => {
  for (const sub of ["biology", "geography"])
    for (let day = 0; day < 7; day++)
      for (const stage of [0, 1])
        for (const q of scienceQuestions(sub, day, stage, "2026-11-01")) {
          const original = JSON.stringify(q),
            shown = diagramQuestion(q),
            target = guideTarget(q);
          assert.ok(
            diagramParts(shown).some((p) => p[0] === target[0]),
            q.id,
          );
          assert.ok(
            scienceVisual(q).includes('data-region="' + target[0] + '"'),
            q.id,
          );
          assert.equal(JSON.stringify(q), original);
        }
  const stimulus = scienceQuestions("biology", 0, 0, "2026-11-01")[2];
  assert.equal(diagramQuestion(stimulus).visual, "stimulus");
  assert.equal(guideTarget(stimulus)[0], "light");
});
test("hemisphere boundary and illumination are geographically distinct from longitude sign and painted shading", () => {
  assert.equal(hemispheres(-41.29, 174.78), "南半球 · 西半球");
  assert.equal(hemispheres(23.13, 113.28), "北半球 · 东半球");
  assert.equal(hemispheres(0, -20), "赤道上 · 东西半球分界线上");
  assert.ok(illumination([1, 0, 0], [1, 0, 0]) > 0);
  assert.ok(illumination([-1, 0, 0], [1, 0, 0]) < 0);
  assert.equal(illumination([0, 1, 0], [1, 0, 0]), 0);
});
test("each partner ships ten distinct actual local raster files", () => {
  const states = [
    "idle_default",
    "greet",
    "thinking",
    "hint_light",
    "hint_step",
    "correct_small",
    "correct_big",
    "wrong_soft",
    "wrong_retry",
    "complete",
  ];
  for (const p of partners) {
    const hashes = new Set(
      states.map((s) => {
        const b = readFileSync(`public/assets/partners/${p.id}/${s}.webp`);
        assert.equal(b.toString("ascii", 8, 12), "WEBP");
        assert.ok(b.length > 1000);
        return createHash("sha256").update(b).digest("hex");
      }),
    );
    assert.equal(hashes.size, 10, p.id);
  }
});
test("everyday observations show large generated pictures and clues without giving the classification", () => {
  const q = scienceQuestions("biology", 0, 0, "2026-11-01")[0];
  const html = scienceVisual(q);
  for (const id of ["seedling", "snail", "rock", "car"]) {
    assert.ok(html.includes(`observation/${id}.webp`));
    assert.ok(
      readFileSync(`public/assets/observation/${id}.webp`).length > 1000,
    );
  }
  assert.doesNotMatch(html, /[🌱🐌◒▰]/u);
  for (const [, , note] of diagramParts(q))
    assert.doesNotMatch(note, /属于生物|不属于生物|不是生物|是生物/);
  assert.match(diagramParts(q)[0][2], /我会慢慢长高，还会呼吸/);
});
