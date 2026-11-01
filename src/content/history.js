import { historyRows } from "./history-data.js";
export { historyRows };
export const historyTopicIds = Array.from(
  { length: 27 },
  (_, i) => `history-point${i + 1}`,
);
export const historyTopicNames = Object.fromEntries(
  historyTopicIds.map((id, i) => [id, `历史 · 知识点${i + 1}`]),
);
const alternatives = {
  "history-08-01": ["中华文明"],
  "history-10-02": ["最后一个王"],
  "history-15-01": ["燕", "赵", "魏韩"],
  "history-15-02": ["齐", "楚", "秦"],
  "history-21-01": ["我国古代第一次思想文化发展高峰"],
  "history-25-03": ["中央集权制度"],
};
const extraBlanks = {
  "history-01-03": [["山顶洞人", "磨光和钻孔技术", "爱美意识"]],
  "history-02-02": [["磨制石器"]],
  "history-07-01": [["文明社会"]],
  "history-11-02": [["士"]],
  "history-11-03": [["分封制"]],
  "history-16-01": [["变法"]],
  "history-20-02": [["孔孟"]],
  "history-21-02": [["墨子", "非攻"]],
};
export function historyVariants(row) {
  if (row.answers.length === 1) return [row.answers, alternatives[row.id]];
  return [
    row.answers,
    ...row.answers.map((a) => [a]),
    ...(extraBlanks[row.id] || []),
  ];
}
export function historyQuestion(rowId, variant = 0, instance = rowId) {
  const row = historyRows.find((r) => r.id === rowId);
  if (!row) throw Error("历史题目不存在");
  const answers = historyVariants(row)[variant];
  if (!answers) throw Error("历史挖空方式不存在");
  const spans = answers
    .map((answer) => ({ answer, start: row.text.indexOf(answer) }))
    .sort((a, b) => a.start - b.start);
  if (spans.some((s) => s.start < 0)) throw Error("历史答案与原文不匹配");
  const segments = [];
  let end = 0;
  for (const s of spans) {
    segments.push(row.text.slice(end, s.start));
    end = s.start + s.answer.length;
  }
  segments.push(row.text.slice(end));
  const actualAnswers = spans.map((s) => s.answer);
  return {
    id: instance,
    rowId,
    variant,
    subject: "history",
    point: row.point,
    template: `history-point${row.point}`,
    topic: `知识点${row.point} · 线索${row.id.slice(-2)}`,
    text: row.text,
    prompt: segments.join("____"),
    segments,
    answers: actualAnswers,
    image: `./public/assets/history/${row.id}.webp`,
    imageAlt: `知识点${row.point}的情境联想插画`,
    hints:
      variant === 0
        ? row.hints
        : [
            "沿着原句读一遍，先判断这次挖空的是人物、名称、作用还是概念。",
            "这次换了挖空位置；把记住的整句话连起来，再补上缺少的词。",
          ],
    memory: row.memory,
  };
}
export const normalizeHistory = (v) =>
  String(v)
    .normalize("NFKC")
    .replace(/[\s，,。、“”‘’《》「」；;：:（）()·]/g, "")
    .replace(/[—–－~～至到-]+/g, "-");
export function checkHistory(q, input) {
  return q.answers.map(
    (answer, i) =>
      normalizeHistory(input[i] || "") === normalizeHistory(answer),
  );
}
function dayNumber(date) {
  return Math.floor(Date.parse(date + "T00:00:00Z") / 86400000);
}
export function selectHistoryQuestions(store, date, stage = 0) {
  if (stage !== 0) throw Error("历史每天是一整轮复习，不另设加练");
  const day = dayNumber(date);
  return historyRows.map((row, i) => {
    const variant =
      ((day % historyVariants(row).length) + historyVariants(row).length) %
      historyVariants(row).length;
    return historyQuestion(
      row.id,
      variant,
      `history:${date}:0:${row.id}:v${variant}:${i}`,
    );
  });
}
