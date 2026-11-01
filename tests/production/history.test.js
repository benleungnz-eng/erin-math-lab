import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  historyRows,
  historyVariants,
  historyQuestion,
  checkHistory,
} from "../../src/content/history.js";
import {
  initial,
  begin,
  validate,
  mergeStates,
} from "../../src/storage/state.js";
import { migrateAcademy, startScience } from "../../src/academy.js";
import {
  startHistory,
  submitHistory,
  helpHistory,
  advanceHistory,
} from "../../src/history.js";
import { makeReport, validateReport, summarize } from "../../src/reports.js";
const date = (d) => new Date(`2026-11-${String(d).padStart(2, "0")}T06:00:00Z`);
const state = () => {
  const d = initial();
  migrateAcademy(d);
  return d;
};
function finish(d, day, study = false, stage = 0) {
  const s = startHistory(d, stage, date(day));
  while (!s.completed) {
    const t = { session: s.id, index: s.index };
    if (study) helpHistory(d, t, 3);
    else
      assert.equal(
        submitHistory(d, t, s.questions[s.index].answers).correct,
        true,
      );
    assert.equal(advanceHistory(d, t), true);
  }
  return s;
}
test("all 27 source points are covered, every variant restores the exact source and has 1–3 nonempty blanks", () => {
  const source = JSON.parse(
    fs.readFileSync(
      new URL("../../src/content/history-source.json", import.meta.url),
    ),
  );
  assert.equal(historyRows.length, 61);
  assert.deepEqual(
    [...new Set(historyRows.map((r) => r.point))].sort((a, b) => a - b),
    Array.from({ length: 27 }, (_, i) => i + 1),
  );
  for (const row of historyRows) {
    assert.ok(source.points[row.point - 1].text.includes(row.text), row.id);
    const prompts = new Set();
    for (let v = 0; v < historyVariants(row).length; v++) {
      const q = historyQuestion(row.id, v);
      assert.ok(q.answers.length >= 1 && q.answers.length <= 3);
      assert.ok(q.answers.every((a) => a.trim()));
      assert.equal(
        q.segments.reduce((s, p, i) => s + p + (q.answers[i] || ""), ""),
        row.text,
      );
      assert.ok(!prompts.has(q.prompt), row.id);
      prompts.add(q.prompt);
      assert.ok(checkHistory(q, q.answers).every(Boolean));
    }
  }
});
test("per-blank feedback, empty input, retry, stale token and help accounting stay honest", () => {
  const d = state(),
    s = startHistory(d, 0, date(2)),
    t = { session: s.id, index: 0 };
  s.questions[0] = historyQuestion(s.questions[0].rowId, 0, s.questions[0].id);
  const q = s.questions[0];
  assert.equal(submitHistory(d, t, []).valid, false);
  assert.equal(s.records[0].errors, 0);
  const bad = [...q.answers];
  bad[1] = "待想";
  const r = submitHistory(d, t, bad);
  assert.equal(r.correct, false);
  assert.deepEqual(r.checked, [true, false, true]);
  assert.equal(submitHistory(d, t, q.answers).correct, true);
  assert.equal(s.records[0].mode, "retried");
  advanceHistory(d, t);
  assert.equal(submitHistory(d, t, q.answers).stale, true);
  const t2 = { session: s.id, index: 1 };
  helpHistory(d, t2, 3);
  advanceHistory(d, t2);
  assert.equal(s.records[1].mode, "studied");
  assert.equal(s.records[1].errors, 0);
  validate(d);
});
test("history migration and practice preserve math/science evidence and backup/reward idempotency", () => {
  const d = state();
  begin(d, 0, date(1));
  startScience(d, "biology", 0, date(1));
  const math = structuredClone(d.sessions),
    science = structuredClone(d.academy.science),
    inventory = structuredClone(d.inventory);
  const s = finish(d, 1, true),
    rewards = Object.keys(d.academy.rewards).length;
  assert.equal(advanceHistory(d, { session: s.id, index: 3 }), false);
  assert.equal(Object.keys(d.academy.rewards).length, rewards);
  assert.deepEqual(d.sessions, math);
  assert.deepEqual(d.academy.science, science);
  assert.deepEqual(d.inventory, inventory);
  validate(d);
  const merged = mergeStates(state(), d);
  validate(merged);
  assert.deepEqual(merged.academy.history.sessions, d.academy.history.sessions);
  const report = validateReport(makeReport(d));
  assert.equal(summarize(report, "history").n, 61);
  assert.ok(report.records.some((r) => r.subject === "history"));
  const tampered = structuredClone(d);
  tampered.academy.history.sessions[s.id].questions[0].answers[0] = "错位";
  assert.throws(() => validate(tampered));
});
test("every day includes all 61 rows and 27 points with different blanks, pauses resume, new days preserve earlier drafts", () => {
  const d = state(),
    first = finish(d, 1, true);
  assert.equal(first.questions.length, 61);
  assert.equal(new Set(first.questions.map((q) => q.point)).size, 27);
  const second = startHistory(d, 0, date(2));
  assert.equal(second.questions.length, 61);
  for (const q of second.questions)
    assert.notEqual(
      q.prompt,
      first.questions.find((x) => x.rowId === q.rowId).prompt,
    );
  second.records[0].input[0] = "输入中的线索";
  assert.equal(startHistory(d, 0, date(2)).id, second.id);
  const third = startHistory(d, 0, date(3));
  assert.notEqual(third.id, second.id);
  assert.equal(
    d.academy.history.sessions[second.id].records[0].input[0],
    "输入中的线索",
  );
  assert.throws(() => startHistory(d, 1, date(3)));
  validate(d);
});
test("answer normalization accepts harmless whitespace, fullwidth punctuation and range dash variants only", () => {
  const q = historyQuestion("history-01-02");
  assert.deepEqual(
    checkHistory(q, ["７０万～２０万", " 直立行走 ", "使用火"]),
    [true, true, true],
  );
  assert.equal(checkHistory(q, ["70万20万", "直立", "火"])[0], false);
});

test("every history row has a separate nonempty local generated WebP image", () => {
  const ids = new Set();
  for (const row of historyRows) {
    const image = fs.readFileSync(
      new URL(`../../public/assets/history/${row.id}.webp`, import.meta.url),
    );
    assert.ok(image.length > 1000, row.id);
    assert.equal(image.toString("ascii", 0, 4), "RIFF");
    assert.equal(image.toString("ascii", 8, 12), "WEBP");
    assert.ok(!ids.has(row.id));
    ids.add(row.id);
  }
  assert.equal(ids.size, 61);
});

test("rotation also quizzes the remaining source keywords, not only the initial marked terms", () => {
  const answers = new Set(
    historyRows.flatMap((row) => historyVariants(row).flat()),
  );
  for (const keyword of [
    "山顶洞人",
    "磨光和钻孔技术",
    "爱美意识",
    "磨制石器",
    "士",
    "分封制",
    "墨子",
    "非攻",
    "孔孟",
  ])
    assert.ok(answers.has(keyword), keyword);
});
