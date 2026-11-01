import { show } from "./engine/rational.js";
// Presentation only: never rewrite saved/generated questions or change their fingerprints.
export function linearExpression(
  coefficient,
  constant = { n: 0, d: 1 },
  variable = "x",
) {
  const a = coefficient.n,
    b = constant.n;
  const term =
    a === 0
      ? ""
      : `${a === coefficient.d ? "" : a === -coefficient.d ? "−" : show(coefficient)}${variable}`;
  if (!term) return show(constant);
  if (!b) return term;
  return `${term} ${b < 0 ? "−" : "+"} ${show({ n: Math.abs(b), d: constant.d })}`;
}
export function presentQuestion(original) {
  if (
    !["bracket", "polynomial", "coefficient", "substitute"].includes(
      original.templateId,
    )
  )
    return original;
  const q = structuredClone(original),
    p = q.params;
  if (q.templateId === "bracket") {
    const result = linearExpression(q.correctAnswer[0], q.correctAnswer[1]);
    q.guidedSteps[1].feedback =
      p.a === p.b
        ? `${p.a}x − ${p.b}x = 0x = 0。两项抵消，化简后不再写 x 项；分栏中的 x 系数填 0。`
        : `${p.a}x − ${p.b}x = ${linearExpression(q.correctAnswer[0])}，合并时只算系数。`;
    q.guidedSteps[2].feedback = `常数 ${p.c} + ${p.d} = ${p.c + p.d}。所以化简结果是 ${result}。${p.a === p.b ? "剩下的只有常数，不需要再写 0x。" : ""}`;
    q.simplifiedExpression = result;
  } else if (q.templateId === "polynomial") {
    q.simplifiedExpression = linearExpression(
      q.correctAnswer[0],
      q.correctAnswer[1],
    );
    q.guidedSteps[2].feedback = `常数 −${p.b} + ${p.c} = ${p.c - p.b}。最后是 ${q.simplifiedExpression}。${p.b === p.c ? "常数相互抵消，常数栏填 0，完整式子不必写 + 0。" : "变量项和常数项分别合并。"}`;
  } else if (q.templateId === "coefficient") {
    q.simplifiedExpression = linearExpression(
      q.correctAnswer[0],
      { n: 0, d: 1 },
      "b",
    );
    q.guidedSteps[1].feedback =
      q.correctAnswer[0].n === 0
        ? "两个 b 项正好抵消，结果是 0，没有剩下的 b 项。本题问 b 的系数，填 0。"
        : `系数合成 ${show(q.correctAnswer[0])}，完整结果是 ${q.simplifiedExpression}。`;
  } else if (p.a === p.c) {
    q.guidedSteps[0].feedback = `${p.a}x − ${p.c}x = 0，x 项正好抵消，只剩常数 ${p.b}。所以无论 x 取什么值，结果都是 ${p.b}。`;
    q.guidedSteps[1].feedback = `0 × (−${p.d}) = 0。x 项已经抵消，代入不会改变结果。`;
  }
  q.explanation = q.guidedSteps
    .filter((s) => s.type !== "groups" && s.type !== "axis")
    .map((s) => ({ math: s.prompt, detail: s.feedback }));
  q.explanation.push(
    q.simplifiedExpression
      ? {
          math: `化简结果：${q.simplifiedExpression}`,
          detail:
            q.labels.length > 1
              ? `分栏填写：x 的系数 ${show(q.correctAnswer[0])}；常数项 ${show(q.correctAnswer[1])}。${q.correctAnswer[0].n === 0 ? "没有 x 项，系数就是 0。" : q.correctAnswer[1].n === 0 ? "没有常数项，常数栏填 0。" : ""}`
              : `完整结果是 ${q.simplifiedExpression}；本题只需填写 b 的系数 ${show(q.correctAnswer[0])}。`,
        }
      : original.explanation.at(-1),
  );
  return q;
}
export function answerInstructions(q) {
  if (q.labels.length === 2 && q.labels[0] === "x 的系数")
    return "按 ax + b 分栏填写：第一栏填 x 的系数 a，第二栏填常数 b。没有 x 项时，系数填 0；没有常数项时，常数栏填 0。";
  if (q.templateId === "coefficient")
    return "这一栏只填 b 的系数，不填字母 b。如果 b 项全部抵消，系数填 0。";
  return "";
}
