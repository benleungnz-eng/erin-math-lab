import test from "node:test";
import assert from "node:assert/strict";
import { generate } from "../../src/engine/templates.js";
import {
  linearExpression,
  presentQuestion,
  answerInstructions,
} from "../../src/algebra-presentation.js";
import { answerQuestion } from "../../src/storage/state.js";
test("reported 7x - (7x - 4) + 2 simplifies to 6 and accepts coefficient 0 / constant 6", () => {
  const original = generate("bracket", 689),
    saved = JSON.stringify(original),
    q = presentQuestion(original);
  assert.deepEqual(q.params, { a: 7, b: 7, c: 4, d: 2 });
  assert.equal(q.simplifiedExpression, "6");
  assert.match(q.guidedSteps[1].feedback, /抵消/);
  assert.match(q.explanation.at(-1).math, /结果：6$/);
  assert.match(q.explanation.at(-1).detail, /系数 0；常数项 6/);
  assert.deepEqual(answerQuestion(original, ["0", "6"]), {
    valid: true,
    correct: true,
  });
  assert.equal(answerQuestion(original, ["7", "6"]).correct, false);
  assert.match(answerInstructions(q), /没有 x 项时，系数填 0/);
  assert.equal(JSON.stringify(original), saved);
  assert.equal(original.templateVersion, 1);
});
test("canonical algebra drops zero terms, simplifies unit coefficients, and formats signs", () => {
  const n = (value) => ({ n: value, d: 1 });
  for (const [a, b, expected] of [
    [0, 6, "6"],
    [0, 0, "0"],
    [1, 0, "x"],
    [-1, 0, "−x"],
    [3, 0, "3x"],
    [-2, -4, "-2x − 4"],
    [3, -4, "3x − 4"],
  ])
    assert.equal(linearExpression(n(a), n(b)), expected);
  assert.equal(linearExpression(n(0), n(0), "b"), "0");
});
test("presentation supports old instances without mutating persisted answers, fingerprints or guide indices", () => {
  const seen = { bracket: 0, coefficient: 0, polynomial: 0, substitute: 0 };
  for (const id of Object.keys(seen))
    for (let seed = 0; seed < 1000; seed++) {
      const raw = generate(id, seed),
        before = JSON.stringify(raw),
        q = presentQuestion(raw);
      assert.equal(JSON.stringify(raw), before);
      assert.deepEqual(q.correctAnswer, raw.correctAnswer);
      assert.equal(q.contentFingerprint, raw.contentFingerprint);
      assert.equal(q.guidedSteps.length, raw.guidedSteps.length);
      if (id === "bracket" && raw.params.a === raw.params.b) {
        seen.bracket++;
        assert.equal(
          q.simplifiedExpression,
          String(raw.params.c + raw.params.d),
        );
      }
      if (id === "coefficient" && raw.correctAnswer[0].n === 0) {
        seen.coefficient++;
        assert.equal(q.simplifiedExpression, "0");
        assert.match(q.explanation.at(-1).detail, /填|填写/);
      }
      if (id === "polynomial" && raw.correctAnswer[1].n === 0) {
        seen.polynomial++;
        assert.equal(q.simplifiedExpression, `${raw.params.a}x`);
      }
      if (id === "substitute" && raw.params.a === raw.params.c) {
        seen.substitute++;
        assert.match(q.guidedSteps[0].feedback, /无论 x 取什么值/);
      }
    }
  assert.ok(Object.values(seen).every((n) => n > 0));
});
