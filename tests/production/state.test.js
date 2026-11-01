import test from "node:test";
import assert from "node:assert/strict";
import {
  initial,
  begin,
  submit,
  help,
  advance,
  reward,
  makePractice,
  validate,
  mergeStates,
} from "../../src/storage/state.js";
import { editWorld } from "../../src/world/actions.js";
import { generate } from "../../src/engine/templates.js";
import { show } from "../../src/engine/rational.js";
const now = new Date("2026-11-01T15:59:00Z");
function token(s) {
  return {
    session: s.id,
    index: s.index,
    question: s.questions[s.index].instanceId,
  };
}
const answers = (q) =>
  q.correctAnswer.map((v) => (typeof v === "string" ? v : show(v)));
function complete(d, s) {
  while (!s.completed) {
    const t = token(s);
    help(d, t, 3, true);
    advance(d, t);
  }
}
test("help is not an error, post-hint success is not independent, stale submit/advance ignored", () => {
  const d = initial(),
    s = begin(d, 0, now),
    t = token(s);
  help(d, t, 3, true);
  assert.equal(s.records[0].errors, 0);
  assert.equal(s.records[0].requestedHelp, true);
  submit(d, t, answers(s.questions[0]));
  assert.equal(s.records[0].mode, "helped");
  assert.equal(advance(d, t), true);
  assert.equal(advance(d, t), false);
  assert.deepEqual(submit(d, t, ["100"]), { stale: true });
  assert.equal(s.index, 1);
});
test("independent versus retry, unfinished drafts and inputs survive serialization", () => {
  const d = initial(),
    s = begin(d, 0, now);
  s.records[0].input = ["-"];
  s.records[0].draft = [
    {
      points: [
        [0.2, 0.3],
        [0.4, 0.5],
      ],
      erase: false,
    },
  ];
  assert.equal(begin(d, 0, new Date("2026-11-02T05:00Z")), s);
  assert.deepEqual(
    validate(JSON.parse(JSON.stringify(d))).sessions[s.id].records[0].draft,
    s.records[0].draft,
  );
  const t = token(s);
  submit(d, t, s.questions[0].choices ? ["not a choice"] : ["99999"]);
  assert.equal(s.records[0].errors, s.questions[0].choices ? 0 : 1);
  submit(d, t, answers(s.questions[0]));
  assert.equal(
    s.records[0].mode,
    s.questions[0].choices ? "independent" : "retried",
  );
});
test("5+3+2 stage ledger idempotency, full reward with help, exact inventory", () => {
  const d = initial();
  assert.throws(() => begin(d, 1, now));
  for (let stage = 0; stage < 3; stage++) {
    const s = begin(d, stage, now);
    assert.equal(s.questions.length, [5, 3, 2][stage]);
    complete(d, s);
    const before = JSON.stringify(d.inventory);
    reward(d, s);
    assert.equal(JSON.stringify(d.inventory), before);
    assert.equal(begin(d, stage, now).id, s.id);
  }
  assert.equal(Object.keys(d.ledger).length, 3);
  assert.ok(d.inventory.bridge >= 2);
  assert.equal(
    Object.values(d.sessions).reduce((n, s) => n + s.records.length, 0),
    10,
  );
  assert.equal(validate(d), d);
});
test("midnight locks old session/date and awards once, next day content changes", () => {
  const d = initial(),
    s = begin(d, 0, now);
  const ids = s.questions.map((q) => q.contentFingerprint);
  const resumed = begin(d, 0, new Date("2026-11-01T16:01Z"));
  assert.equal(resumed.date, "2026-11-01");
  complete(d, s);
  const next = begin(d, 0, new Date("2026-11-01T16:01Z"));
  assert.equal(next.date, "2026-11-02");
  assert.ok(next.questions.every((q) => !ids.includes(q.contentFingerprint)));
  assert.equal(Object.keys(d.ledger).length, 1);
});
test("coefficients and constants are both checked; semantic transfer does not enter base denominator", () => {
  const d = initial(),
    s = begin(d, 0, now);
  s.questions[0] = generate("polynomial", 44);
  const t = token(s);
  assert.equal(
    submit(d, t, [show(s.questions[0].correctAnswer[0]), "999"]).correct,
    false,
  );
  assert.equal(submit(d, t, answers(s.questions[0])).correct, true);
  makePractice(d, t);
  assert.equal(s.questions.length, 5);
  assert.notEqual(
    s.records[0].practice.question.contentFingerprint,
    s.questions[0].contentFingerprint,
  );
  makePractice(d, t);
  assert.equal(s.records[0].practice.source, s.questions[0].instanceId);
});
test("world reversible place, rotate, move, recover and stale conflict", () => {
  const d = initial();
  assert.ok(editWorld(d, { type: "place", cell: 0, id: "tree" }));
  assert.ok(editWorld(d, { type: "rotate", cell: 0 }));
  assert.equal(d.layout.find((x) => x.cell === 0).rotation, 1);
  assert.ok(editWorld(d, { type: "move", cell: 0, to: 1, expectedId: "tree" }));
  assert.equal(
    editWorld(d, { type: "move", cell: 0, to: 2, expectedId: "tree" }),
    false,
  );
  assert.ok(editWorld(d, { type: "remove", cell: 1 }));
  assert.ok(editWorld(d, { type: "undo" }));
  assert.ok(d.layout.some((x) => x.cell === 1 && x.id === "tree"));
  assert.equal(validate(d), d);
});
test("imports validate actual questions and refuse corrupt data; merge does not duplicate rewards", () => {
  const d = initial(),
    s = begin(d, 0, now);
  complete(d, s);
  const incoming = structuredClone(d);
  const merged = mergeStates(d, incoming);
  assert.deepEqual(merged.inventory, d.inventory);
  assert.deepEqual(merged.ledger, d.ledger);
  for (const bad of [
    null,
    { schema: 99 },
    { ...d, layout: [{ cell: 500, id: "hut" }] },
  ])
    assert.throws(() => validate(bad));
  const fake = structuredClone(d);
  fake.sessions[s.id].questions[0].instanceId = "other";
  assert.throws(() => validate(fake));
});
test("review candidates are available after natural days 2 and 5, including help", () => {
  const d = initial(),
    first = begin(d, 0, new Date("2026-11-01T06:00Z"));
  help(d, token(first), 3, true);
  const topic = first.questions[0].templateId;
  complete(d, first);
  assert.equal(d.queue.find((x) => x.templateId === topic).due, "2026-11-03");
  const next = begin(d, 0, new Date("2026-11-03T06:00Z"));
  while (!next.completed) {
    const t = token(next);
    help(d, t, 3, true);
    advance(d, t);
  }
  assert.equal(d.queue.find((x) => x.templateId === topic).due, "2026-11-06");
});
