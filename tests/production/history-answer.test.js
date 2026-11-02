import test from "node:test";
import assert from "node:assert/strict";
import { partners } from "../../src/partners.js";
import { historyAnswerLine } from "../../src/history-ui.js";
test("every history partner has distinct recall dialogue without derivation or hints", () => {
  const lines = partners.flatMap((p) =>
    [0, 1].map((i) => historyAnswerLine(p.id, i)),
  );
  assert.equal(new Set(lines).size, partners.length * 2);
  for (const p of partners)
    for (const i of [0, 1]) {
      const text = historyAnswerLine(p.id, i);
      assert.ok(text.startsWith(p.name + "："));
      assert.doesNotMatch(text, /推导|步骤|线索|条件/);
    }
});
