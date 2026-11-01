import test from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  begin,
  submit,
  help,
  advance,
  validate,
} from "../../src/storage/state.js";
import {
  makeReport,
  validateReport,
  mergeReports,
  emptyReport,
  summarize,
} from "../../src/reports.js";
const fixture = () => {
  const d = initial();
  const s = begin(d, 0, new Date("2026-11-01T06:00:00Z"));
  return {
    d,
    s,
    token: { session: s.id, index: 0, question: s.questions[0].instanceId },
  };
};
const answer = (q) =>
  q.correctAnswer.map((r) =>
    typeof r === "string" ? r : r.d === 1 ? String(r.n) : `${r.n}/${r.d}`,
  );
test("reports include only allowed learning fields, never draft, layout, inputs or reflection", () => {
  const { d, s, token } = fixture();
  s.reflection = "private-note";
  s.records[0].draft = [
    {
      erase: false,
      points: [
        [0, 0],
        [0.1, 0.2],
      ],
    },
  ];
  submit(d, token, answer(s.questions[0]));
  const report = makeReport(d);
  assert.equal(report.records.length, 1);
  assert.equal(report.records[0].mode, "independent");
  assert.ok(
    !/private-note|draft|layout|input|correctAnswer|seed/.test(
      JSON.stringify(report),
    ),
  );
  assert.deepEqual(validateReport(report), report);
});
test("same record is idempotent, newer progress replaces pending and old imports never regress", () => {
  const { d, s, token } = fixture();
  submit(
    d,
    token,
    s.questions[0].choices
      ? [
          s.questions[0].choices.find(
            (x) => x !== s.questions[0].correctAnswer[0],
          ),
        ]
      : s.questions[0].correctAnswer.map(() => "999"),
  );
  const old = makeReport(d);
  submit(d, token, answer(s.questions[0]));
  const newer = makeReport(d);
  assert.ok(newer.records[0].revision > old.records[0].revision);
  const merged = mergeReports(old, newer);
  assert.equal(merged.records.length, 1);
  assert.equal(merged.records[0].mode, "retried");
  assert.deepEqual(mergeReports(merged, old), merged);
  assert.deepEqual(mergeReports(merged, newer), merged);
});
test("guidance and studying remain distinct from errors, dates and samples are explicit", () => {
  const { d, s, token } = fixture();
  help(d, token, 3, true);
  advance(d, token);
  const r = makeReport(d);
  const a = summarize(r);
  assert.equal(a.helped, 1);
  assert.equal(a.errors, 0);
  assert.equal(a.independent, 0);
  assert.equal(a.days, 1);
  assert.equal(a.finished, 1);
  assert.equal(a.n, 1);
  assert.equal(r.records[0].mode, "studied");
  assert.deepEqual(validate(d), d);
});
test("invalid dates, duplicate IDs, counters, modes, contradictory results and version conflicts are rejected", () => {
  const { d, s, token } = fixture();
  submit(d, token, answer(s.questions[0]));
  const good = makeReport(d);
  for (const change of [
    (r) => (r.version = 8),
    (r) => r.records.push({ ...r.records[0] }),
    (r) => (r.records[0].date = "2026-02-30"),
    (r) => (r.records[0].errors = -1),
    (r) => (r.records[0].hint = 9),
    (r) => (r.records[0].mode = "fake"),
    (r) => (r.records[0].errors = 2),
  ]) {
    const r = structuredClone(good);
    change(r);
    assert.throws(() => validateReport(r));
  }
  const conflict = structuredClone(good);
  conflict.records[0].template =
    good.records[0].template === "axis" ? "sum" : "axis";
  assert.throws(() => mergeReports(good, conflict), /冲突/);
  assert.equal(good.records.length, 1);
});
test("multi-day reports merge without changing student sessions and empty report has zero samples", () => {
  const { d, s, token } = fixture();
  submit(d, token, answer(s.questions[0]));
  const first = makeReport(d);
  const before = JSON.stringify(d);
  const other = structuredClone(first);
  other.records[0].date = "2026-11-02";
  other.records[0].id = other.records[0].id.replace("2026-11-01", "2026-11-02");
  const r = mergeReports(first, other);
  assert.equal(summarize(r).days, 2);
  assert.equal(summarize(r).n, 2);
  assert.equal(JSON.stringify(d), before);
  assert.equal(summarize(emptyReport()).n, 0);
});
