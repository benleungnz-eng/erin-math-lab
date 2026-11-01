import { historyTopicIds, historyTopicNames } from "./content/history.js";
import { subjects, topicIds, topicNames } from "./content/science.js";
export const reportTypeName = (id) =>
  historyTopicNames[id] ||
  topicNames[id] ||
  names[templateIds.indexOf(id)] ||
  id;
import { templateIds, names } from "./engine/templates.js";
export const REPORT_KEY = "erin-parent-reports-v1";
const modes = ["independent", "retried", "helped", "studied", "deferred"];
export const modeNames = {
  independent: "独立首次答对",
  retried: "重试答对",
  helped: "提示后答对",
  studied: "看讲解学习",
  deferred: "稍后再练",
  pending: "进行中",
};
export function makeReport(state, date = null) {
  const records = [];
  for (const s of [
    ...Object.values(state.sessions),
    ...Object.values(state.academy?.science.sessions || {}),
    ...Object.values(state.academy?.history?.sessions || {}),
  ]) {
    if (date && s.date !== date) continue;
    s.questions.forEach((q, i) => {
      const r = s.records[i];
      if (!r.mode && !r.errors && !r.maxHint) return;
      records.push({
        id: `${s.date}:${s.stage}:${q.instanceId || q.id}`,
        subject: s.subject || "math",
        revision:
          1 +
          r.errors +
          r.maxHint +
          r.guideEvents.length +
          (r.resolved ? 1 : 0) +
          (r.mode ? 1 : 0),
        date: s.date,
        stage: s.stage,
        template: q.templateId || q.template,
        mode: r.mode || "pending",
        errors: r.errors,
        hint: r.maxHint,
        explanation: Boolean(r.viewedExplanation),
      });
    });
  }
  return { format: "erin-learning-report", version: 2, records };
}
export function validateReport(raw) {
  if (
    !raw ||
    raw.format !== "erin-learning-report" ||
    ![1, 2].includes(raw.version) ||
    !Array.isArray(raw.records) ||
    raw.records.length > 50000
  )
    throw Error("报告格式、版本或大小不支持");
  const seen = new Set();
  const records = raw.records.map((r) => {
    if (
      !r ||
      typeof r.id !== "string" ||
      r.id.length > 240 ||
      seen.has(r.id) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
      !Number.isFinite(Date.parse(r.date)) ||
      new Date(r.date).toISOString().slice(0, 10) !== r.date ||
      !r.id.startsWith(`${r.date}:${r.stage}:`) ||
      !Number.isSafeInteger(r.revision) ||
      r.revision < 1 ||
      ![0, 1, 2].includes(r.stage) ||
      ![...templateIds, ...topicIds, ...historyTopicIds].includes(r.template) ||
      (r.subject === undefined && !templateIds.includes(r.template)) ||
      (r.subject !== undefined && !Object.hasOwn(subjects, r.subject)) ||
      (r.subject !== undefined &&
        (r.subject === "math"
          ? !templateIds.includes(r.template)
          : !r.template.startsWith(r.subject + "-"))) ||
      ![...modes, "pending"].includes(r.mode) ||
      !Number.isSafeInteger(r.errors) ||
      r.errors < 0 ||
      r.errors > 1000000 ||
      ![0, 1, 2, 3].includes(r.hint) ||
      typeof r.explanation !== "boolean"
    )
      throw Error("报告含无效或重复记录，未导入");
    if (
      (r.mode === "independent" && (r.errors || r.hint || r.explanation)) ||
      (r.mode === "retried" && (!r.errors || r.hint)) ||
      (r.explanation && r.hint !== 3)
    )
      throw Error("报告统计不一致，未导入");
    seen.add(r.id);
    return {
      subject: r.subject || "math",
      ...Object.fromEntries(
        [
          "id",
          "revision",
          "date",
          "stage",
          "template",
          "mode",
          "errors",
          "hint",
          "explanation",
        ].map((k) => [k, r[k]]),
      ),
    };
  });
  return { format: "erin-learning-report", version: 2, records };
}
export function mergeReports(current, incoming) {
  const a = validateReport(current),
    b = validateReport(incoming),
    map = new Map(a.records.map((r) => [r.id, r]));
  for (const r of b.records) {
    const old = map.get(r.id);
    if (!old || r.revision > old.revision) map.set(r.id, r);
    else if (
      r.revision === old.revision &&
      JSON.stringify(r) !== JSON.stringify(old)
    )
      throw Error("同一记录的版本冲突，保留原报告，请重新导出最新文件");
  }
  return validateReport({
    ...a,
    records: [...map.values()].sort((x, y) => x.id.localeCompare(y.id)),
  });
}
export const emptyReport = () => ({
  format: "erin-learning-report",
  version: 2,
  records: [],
});
export function readReports() {
  const text = localStorage.getItem(REPORT_KEY);
  return text ? validateReport(JSON.parse(text)) : emptyReport();
}
export function importReport(raw) {
  const report = mergeReports(readReports(), raw);
  localStorage.setItem(REPORT_KEY, JSON.stringify(report));
  return report;
}
export function summarize(report, subject = "all") {
  const allRecords = validateReport(report).records;
  const records = allRecords.filter(
    (r) => subject === "all" || r.subject === subject,
  );
  const group = (list) => ({
    n: list.length,
    finished: list.filter((r) => r.mode !== "pending").length,
    independent: list.filter((r) => r.mode === "independent").length,
    errors: list.reduce((n, r) => n + r.errors, 0),
    helped: list.filter((r) => r.hint > 0 || r.explanation).length,
  });
  return {
    ...group(records),
    days: new Set(records.map((r) => r.date)).size,
    dates: [...new Set(records.map((r) => r.date))].sort().map((date) => ({
      date,
      ...group(records.filter((r) => r.date === date)),
    })),
    subjects: Object.entries(subjects).map(([id, name]) => ({
      id,
      name,
      ...group(allRecords.filter((r) => r.subject === id)),
    })),
    types: [...templateIds, ...topicIds, ...historyTopicIds]
      .map((id, i) => ({
        id,
        name: reportTypeName(id),
        ...group(records.filter((r) => r.template === id)),
      }))
      .filter((r) => r.n)
      .sort((a, b) => b.errors - a.errors),
  };
}
