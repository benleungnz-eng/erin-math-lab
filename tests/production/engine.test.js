import test from "node:test";
import assert from "node:assert/strict";
import { generate, templateIds, hash } from "../../src/engine/templates.js";
import { parse, rational, equal } from "../../src/engine/rational.js";
import {
  stageQuestions,
  learningDate,
  addDays,
} from "../../src/engine/scheduler.js";
import { plans } from "../../src/content/schedule.js";
const F = (n, d = 1) => {
  n = BigInt(n);
  d = BigInt(d);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a < 0n ? -a : a);
  let g = gcd(n, d);
  return {
    n: Number((n / g) * (d < 0n ? -1n : 1n)),
    d: Number((d / g) * (d < 0n ? -1n : 1n)),
  };
};
function oracle(q) {
  const { a, b, c, d, k, m, n, bracket } = q.params;
  switch (q.templateId) {
    case "axis":
      return [F(n)];
    case "absolute":
      return [F(Math.abs(n))];
    case "compare":
      return [`−${a}`];
    case "sum":
      return [F(b - a)];
    case "product":
      return [F(a * b, c)];
    case "fraction":
      return [F((a - 2 * b) * c, 6)];
    case "square":
      return [F((bracket ? a * a : -a * a) + b)];
    case "coefficient":
      return [F(k + m)];
    case "polynomial":
      return [F(a), F(c - b)];
    case "bracket":
      return [F(a - b), F(c + d)];
    case "substitute":
      return [F(c * d - a * d + b)];
    case "clip":
      return [F(a + 2 * c)];
    case "resources":
      return [F(a + b * c)];
    case "order":
      return [`${b} × ${c}`];
  }
}
for (const id of templateIds)
  test(`${id}: 1000 independent answers, hints and local steps`, () => {
    for (let i = 0; i < 1000; i++) {
      const q = generate(id, hash(`${id}/${i}`));
      assert.deepEqual(q.correctAnswer, oracle(q));
      assert.equal(q.guidedSteps.length >= 2, true);
      assert.equal(q.explanation.at(-1).math.startsWith("答案："), true);
      assert.equal(
        q.contentFingerprint,
        generate(id, q.seed + 0).contentFingerprint,
      );
      if (q.choices) assert.equal(new Set(q.choices).size, q.choices.length);
      if (q.visual?.type === "axis") {
        assert.ok(q.visual.position >= -12 && q.visual.position <= 12);
        assert.equal(
          Math.abs(q.visual.position),
          Math.abs(q.params.n ?? -q.params.a),
        );
      }
      const p = q.params,
        steps = q.guidedSteps;
      if (id === "fraction") {
        assert.ok(equal(parse(steps[1].expected), F(2 * p.b)));
        assert.ok(equal(parse(steps[2].expected), F(-p.a + 2 * p.b)));
        assert.ok(equal(parse(steps[3].expected), F(-p.c)));
        assert.ok(equal(parse(steps[4].expected), oracle(q)[0]));
        assert.equal(q.visual.numerator, 2 * p.b);
        assert.equal(q.visual.denominator, 6);
      }
      if (id === "bracket") {
        assert.equal(steps[0].expected, `＋${p.c}`);
        assert.ok(equal(parse(steps[1].expected), F(p.a - p.b)));
        assert.ok(equal(parse(steps[2].expected), F(p.c + p.d)));
      }
      if (id === "substitute") {
        assert.ok(equal(parse(steps[0].expected), F(p.a - p.c)));
        assert.ok(equal(parse(steps[1].expected), F((p.a - p.c) * -p.d)));
        assert.ok(equal(parse(steps[2].expected), oracle(q)[0]));
      }
      if (id === "polynomial") {
        assert.deepEqual(
          q.visual.cards.map((c) => c.group),
          ["变量项", "常数项", "常数项"],
        );
        assert.ok(equal(parse(steps[1].expected), F(p.a)));
        assert.ok(equal(parse(steps[2].expected), F(-p.b + p.c)));
      }
    }
  });
test("exact fractions, decimals, fullwidth and illegal input", () => {
  for (const s of ["2/4", "0.5", "０．５", "１／２", "+ .5"])
    assert.deepEqual(parse(s), F(1, 2));
  assert.deepEqual(parse(" − ３ / ６ "), F(-1, 2));
  assert.deepEqual(parse("-0.25"), F(-1, 4));
  for (const s of [
    "",
    "-",
    "1/0",
    "0/0",
    "1.",
    "1/",
    "1+2",
    "2x",
    "Infinity",
    "<script>",
    "(1)",
    "1/2/3",
  ])
    assert.equal(parse(s), null);
  assert.throws(() => rational(1, 0));
});
test("14 scheduling configurations, 500 days without semantic repeats; recovery max two", () => {
  assert.equal(plans.length, 14);
  const seen = {};
  let date = "2026-11-01";
  for (let i = 0; i < 500; i++) {
    const queue = [
      { templateId: "fraction", due: "2026-10-01" },
      { templateId: "polynomial", due: "2026-10-01" },
      { templateId: "square", due: "2026-10-01" },
    ];
    const qs = stageQuestions(date, 0, seen, queue);
    assert.equal(qs.length, 5);
    assert.equal(qs.filter((q) => q.kind === "review").length, 2);
    for (const q of qs) {
      assert.ok(!seen[q.contentFingerprint]);
      seen[q.contentFingerprint] = true;
    }
    date = addDays(date, 1);
  }
  const q = generate("fraction", 123);
  assert.equal(
    { ...q, instanceId: "different" }.contentFingerprint,
    q.contentFingerprint,
  );
});
test("Shanghai midnight", () => {
  assert.equal(learningDate(new Date("2026-11-01T15:59:00Z")), "2026-11-01");
  assert.equal(learningDate(new Date("2026-11-01T16:01:00Z")), "2026-11-02");
});
