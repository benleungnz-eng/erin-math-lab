import { learningDate } from "./engine/scheduler.js";
import { awardPartner } from "./academy.js";
import {
  selectHistoryQuestions,
  checkHistory,
  historyQuestion,
} from "./content/history.js";
export function ensureHistory(a) {
  return (a.history ||= { sessions: {}, active: null });
}
export function startHistory(data, stage = 0, now = new Date()) {
  const a = data.academy,
    h = ensureHistory(a),
    old = h.sessions[h.active];
  const date = learningDate(now);
  if (stage !== 0) throw Error("历史每天复习整轮，不另设加练");
  if (old && !old.completed && old.date === date) return old;
  const id = `history:${date}:${stage}`;
  if (h.sessions[id]) {
    h.active = id;
    return h.sessions[id];
  }
  if (stage && !h.sessions[`history:${date}:0`]?.completed)
    throw Error("先完成这轮基础探索");
  const questions = selectHistoryQuestions(h, date, stage);
  const s = {
    id,
    subject: "history",
    date,
    stage,
    partnerId: a.selected,
    questions,
    records: questions.map((q) => ({
      input: q.answers.map(() => ""),
      checked: q.answers.map(() => null),
      errors: 0,
      maxHint: 0,
      viewedExplanation: false,
      resolved: false,
      mode: null,
      guideEvents: [],
    })),
    index: 0,
    completed: false,
  };
  h.sessions[id] = s;
  h.active = id;
  return s;
}
export function historyTarget(data, token) {
  const h = ensureHistory(data.academy),
    s = h.sessions[h.active];
  return s && !s.completed && s.id === token.session && s.index === token.index
    ? { s, q: s.questions[s.index], r: s.records[s.index] }
    : null;
}
export function submitHistory(data, token, values) {
  const t = historyTarget(data, token);
  if (!t || t.r.resolved) return { stale: true };
  const input = values || t.r.input;
  if (
    !Array.isArray(input) ||
    input.length !== t.q.answers.length ||
    input.some((v) => typeof v !== "string" || !v.trim() || v.length > 240)
  )
    return { valid: false };
  t.r.input = [...input];
  t.r.checked = checkHistory(t.q, input);
  const correct = t.r.checked.every(Boolean);
  if (correct) {
    t.r.resolved = true;
    t.r.mode = t.r.maxHint ? "helped" : t.r.errors ? "retried" : "independent";
  } else t.r.errors++;
  return { valid: true, correct, checked: t.r.checked };
}
export function helpHistory(data, token, level) {
  const t = historyTarget(data, token);
  if (!t || t.r.resolved) return;
  t.r.maxHint = Math.max(t.r.maxHint, level);
  if (level === 3) t.r.viewedExplanation = true;
}
export function advanceHistory(data, token, defer = false) {
  const t = historyTarget(data, token);
  if (!t) return false;
  if (!t.r.resolved && !t.r.viewedExplanation && !defer) return false;
  t.r.mode ||= defer ? "deferred" : "studied";
  t.s.index++;
  if (t.s.index === t.s.questions.length) {
    t.s.completed = true;
    awardPartner(data, t.s, "history");
  }
  return true;
}
export function validateHistory(a) {
  const h = a.history;
  if (!h) return;
  if (
    !h.sessions ||
    Object.keys(h.sessions).length > 12000 ||
    (h.active !== null && !h.sessions[h.active])
  )
    throw Error("历史进度无效");
  for (const [id, s] of Object.entries(h.sessions)) {
    if (
      s.subject !== "history" ||
      s.id !== id ||
      id !== `history:${s.date}:${s.stage}` ||
      !/^\d{4}-\d{2}-\d{2}$/.test(s.date) ||
      ![0, 1].includes(s.stage) ||
      !a.unlocked.includes(s.partnerId) ||
      !Array.isArray(s.questions) ||
      s.questions.length !== 61 ||
      !Array.isArray(s.records) ||
      s.records.length !== s.questions.length ||
      !Number.isSafeInteger(s.index) ||
      s.index < 0 ||
      s.index > s.questions.length ||
      s.completed !== (s.index === s.questions.length)
    )
      throw Error("历史探索存档无效");
    const seen = new Set();
    s.questions.forEach((q, i) => {
      if (
        seen.has(q.rowId) ||
        JSON.stringify(q) !==
          JSON.stringify(historyQuestion(q.rowId, q.variant, q.id))
      )
        throw Error("历史题目与资料不一致");
      seen.add(q.rowId);
      const r = s.records[i];
      if (
        !r ||
        !Array.isArray(r.input) ||
        r.input.length !== q.answers.length ||
        r.input.some((v) => typeof v !== "string" || v.length > 240) ||
        !Array.isArray(r.checked) ||
        r.checked.length !== q.answers.length ||
        !r.checked.every((v) => [null, true, false].includes(v)) ||
        !Number.isSafeInteger(r.errors) ||
        r.errors < 0 ||
        ![0, 1, 2, 3].includes(r.maxHint) ||
        typeof r.viewedExplanation !== "boolean" ||
        typeof r.resolved !== "boolean" ||
        ![
          null,
          "independent",
          "retried",
          "helped",
          "studied",
          "deferred",
        ].includes(r.mode) ||
        !Array.isArray(r.guideEvents) ||
        r.guideEvents.length !== 0 ||
        (i < s.index && !r.mode) ||
        (r.viewedExplanation && r.maxHint !== 3) ||
        (r.mode === "independent" &&
          (r.errors || r.maxHint || r.viewedExplanation)) ||
        (["independent", "retried", "helped"].includes(r.mode) &&
          (!r.resolved || !checkHistory(q, r.input).every(Boolean)))
      )
        throw Error("历史作答存档无效");
    });
  }
}
export function mergeHistory(out, incoming) {
  if (!incoming.history) return;
  const a = ensureHistory(out),
    b = incoming.history;
  for (const [id, s] of Object.entries(b.sessions)) {
    const old = a.sessions[id];
    if (
      !old ||
      (old.questions.map((q) => q.id).join("|") ===
        s.questions.map((q) => q.id).join("|") &&
        s.index > old.index)
    )
      a.sessions[id] = structuredClone(s);
  }
  if (!a.active && a.sessions[b.active]) a.active = b.active;
}
