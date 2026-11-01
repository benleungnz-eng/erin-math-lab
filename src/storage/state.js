import { characters } from "../characters.js";
import { generate, templateIds } from "../engine/templates.js";
import {
  stageQuestions,
  learningDate,
  addDays,
  fresh,
} from "../engine/scheduler.js";
import { parse, equal } from "../engine/rational.js";
import { catalog } from "../world/catalog.js";
export const SCHEMA = 2;
export function initial() {
  return {
    schema: SCHEMA,
    revision: 0,
    sessions: {},
    active: null,
    seen: {},
    queue: [],
    ledger: {},
    inventory: { hut: 3, tree: 3, lamp: 3 },
    layout: [{ cell: 14, id: "hut", rotation: 0 }],
    layoutHistory: [],
    prefs: { theme: "block", skin: "ember", reduced: false, jokes: true },
    clip: { shots: ["ling", "gu", "lu"], transition: "淡入" },
    legacy: null,
  };
}
export const newRecord = () => ({
  input: [],
  errors: 0,
  maxHint: 0,
  viewedExplanation: false,
  requestedHelp: false,
  resolved: false,
  deferred: false,
  mode: null,
  guideIndex: 0,
  guideEvents: [],
  guideValues: {},
  draft: [],
  practice: null,
});
export function activeSession(data) {
  return data.active ? data.sessions[data.active] : null;
}
export function begin(data, stage = 0, now = new Date()) {
  const current = activeSession(data);
  if (current && !current.completed) return current;
  const date = learningDate(now),
    id = `${date}:${stage}`;
  if (data.sessions[id]) {
    data.active = id;
    return data.sessions[id];
  }
  if (stage > 0 && !data.sessions[`${date}:${stage - 1}`]?.completed)
    throw Error("先完成前一阶段，再选择加练。");
  const questions = stageQuestions(date, stage, data.seen, data.queue);
  questions.forEach((q) => (data.seen[q.contentFingerprint] = true));
  const session = {
    id,
    date,
    stage,
    questions,
    records: questions.map(newRecord),
    index: 0,
    completed: false,
    reflection: "",
    rewardIds: [],
  };
  data.sessions[id] = session;
  data.active = id;
  return session;
}
export function enqueue(data, q, date) {
  const matching = data.queue.find((x) => x.templateId === q.templateId);
  if (!matching)
    data.queue.push({
      templateId: q.templateId,
      origin: date,
      due: addDays(date, 2),
      round: 0,
    });
  else if (matching.due <= date)
    matching.due = addDays(date, matching.round ? 5 : 2);
}
export function target(data, token) {
  const s = activeSession(data);
  if (
    !s ||
    s.id !== token.session ||
    s.index !== token.index ||
    s.completed ||
    s.questions[s.index].instanceId !== token.question
  )
    return null;
  return { s, q: s.questions[s.index], r: s.records[s.index] };
}
export function answerQuestion(q, values) {
  if (q.choices) {
    return {
      valid: q.choices.includes(values[0]),
      correct: values[0] === q.correctAnswer[0],
    };
  }
  const answers = q.correctAnswer.map((_, i) => parse(values[i]));
  return {
    valid: answers.every(Boolean),
    correct: answers.every((v, i) => equal(v, q.correctAnswer[i])),
  };
}
export function submit(data, token, values) {
  const t = target(data, token);
  if (!t || t.r.resolved) return { stale: true };
  const { s, q, r } = t,
    result = answerQuestion(q, values);
  r.input = values;
  if (!result.valid) return { valid: false };
  if (result.correct) {
    r.resolved = true;
    r.mode =
      r.maxHint || r.viewedExplanation
        ? "helped"
        : r.errors
          ? "retried"
          : "independent";
  } else {
    r.errors++;
    enqueue(data, q, s.date);
  }
  return result;
}
export function help(data, token, level, requested = false) {
  const t = target(data, token);
  if (!t || t.r.resolved) return;
  const { s, q, r } = t;
  r.maxHint = Math.max(r.maxHint, level);
  r.requestedHelp ||= requested;
  if (level === 3) r.viewedExplanation = true;
  enqueue(data, q, s.date);
}
export function advance(data, token, deferred = false) {
  const t = target(data, token);
  if (!t) return false;
  const { s, q, r } = t;
  if (!r.resolved && !deferred && !r.viewedExplanation) return false;
  if (!r.resolved) {
    r.mode = deferred ? "deferred" : "studied";
    r.deferred = deferred;
    enqueue(data, q, s.date);
  }
  const due = data.queue.find(
    (x) =>
      x.templateId === q.templateId && (x.due <= s.date || q.kind === "review"),
  );
  if (due) {
    due.round = Math.min(2, due.round + 1);
    if (due.round >= 2 && r.mode === "independent")
      data.queue = data.queue.filter((x) => x !== due);
    else {
      const next = addDays(due.origin || s.date, 5);
      due.due = next > s.date ? next : addDays(s.date, 5);
    }
  }
  r.draft = [];
  s.index++;
  if (s.index === s.questions.length) {
    s.completed = true;
    reward(data, s);
  }
  return true;
}
export function reward(data, s) {
  const key = `${s.date}:stage-${s.stage}`;
  if (data.ledger[key]) return;
  let ids;
  if (s.stage === 0) {
    const unlocked = Object.keys(data.inventory).length;
    ids = catalog.slice(unlocked, unlocked + 3).map((x) => x.id);
    if (!ids.length) ids = ["flowers", "lamp"];
  } else ids = [s.stage === 1 ? "flowers" : "star"];
  for (const id of ids)
    data.inventory[id] = (data.inventory[id] || 0) + (s.stage === 0 ? 2 : 1);
  data.ledger[key] = { session: s.id, ids, stage: s.stage, date: s.date };
  s.rewardIds = ids;
}
export function makePractice(data, token) {
  const t = target(data, token);
  if (!t || t.r.practice) return;
  const q = fresh(
    t.q.templateId,
    t.q.seed ^ 0x9e3779b9,
    data.seen,
    "transfer",
    true,
  );
  data.seen[q.contentFingerprint] = true;
  t.r.practice = { question: q, record: newRecord(), source: t.q.instanceId };
}
export function validate(data) {
  if (
    !data ||
    data.schema !== SCHEMA ||
    !Number.isSafeInteger(data.revision) ||
    !data.sessions ||
    typeof data.sessions !== "object" ||
    Array.isArray(data.sessions) ||
    !data.seen ||
    typeof data.seen !== "object" ||
    Array.isArray(data.seen) ||
    !Array.isArray(data.queue) ||
    !data.ledger ||
    typeof data.ledger !== "object" ||
    !data.inventory ||
    !Array.isArray(data.layout) ||
    !data.prefs ||
    !data.clip
  )
    throw Error("备份格式或版本不支持");
  if (
    Object.keys(data.sessions).length > 6000 ||
    Object.keys(data.seen).length > 60000 ||
    data.queue.length > 28 ||
    data.layout.length > 36
  )
    throw Error("备份超出合理大小");
  function record(r, depth = 0) {
    if (
      !r ||
      !Array.isArray(r.input) ||
      r.input.length > 4 ||
      !r.input.every((v) => typeof v === "string" && v.length <= 60) ||
      !Number.isInteger(r.errors) ||
      r.errors < 0 ||
      !Number.isInteger(r.maxHint) ||
      r.maxHint < 0 ||
      r.maxHint > 3 ||
      !Number.isInteger(r.guideIndex) ||
      r.guideIndex < 0 ||
      r.guideIndex > 10 ||
      !Array.isArray(r.guideEvents) ||
      r.guideEvents.length > 100 ||
      !r.guideEvents.every(
        (e) =>
          e &&
          Number.isInteger(e.index) &&
          e.index >= 0 &&
          e.index < 10 &&
          ["independent", "helped", "demonstrated"].includes(e.mode),
      ) ||
      !r.guideValues ||
      typeof r.guideValues !== "object" ||
      !Array.isArray(r.draft) ||
      r.draft.length > 300 ||
      !["viewedExplanation", "requestedHelp", "resolved", "deferred"].every(
        (k) => typeof r[k] === "boolean",
      ) ||
      ![
        null,
        "independent",
        "retried",
        "helped",
        "studied",
        "deferred",
      ].includes(r.mode)
    )
      throw Error("作答记录不完整");
    for (const line of r.draft)
      if (
        !line ||
        !Array.isArray(line.points) ||
        line.points.length > 3000 ||
        !line.points.every(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            p.every(
              (n) =>
                typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1,
            ),
        ) ||
        typeof line.erase !== "boolean"
      )
        throw Error("草稿格式不正确");
    if (r.practice) {
      if (depth) throw Error("同类题结构不正确");
      question(r.practice.question);
      record(r.practice.record, 1);
    }
  }
  function question(q) {
    if (
      !q ||
      q.templateVersion !== 1 ||
      !templateIds.includes(q.templateId) ||
      !Number.isInteger(q.seed) ||
      q.seed < 0 ||
      q.seed > 4294967295
    )
      throw Error("题目格式不正确");
    const regenerated = generate(q.templateId, q.seed, q.kind);
    for (const k of [
      "instanceId",
      "params",
      "contentFingerprint",
      "correctAnswer",
      "prompt",
      "observation",
      "guidedSteps",
      "explanation",
      "visual",
      "labels",
      "choices",
      "difficulty",
      "skillIds",
      "hintSteps",
    ])
      if (JSON.stringify(q[k]) !== JSON.stringify(regenerated[k]))
        throw Error("题目参数或版本不一致");
  }
  const allQuestions = new Set(),
    allIds = new Set();
  for (const [key, s] of Object.entries(data.sessions)) {
    if (
      !s ||
      !/^\d{4}-\d{2}-\d{2}$/.test(s.date) ||
      ![0, 1, 2].includes(s.stage) ||
      key !== `${s.date}:${s.stage}` ||
      s.id !== key ||
      !Array.isArray(s.questions) ||
      s.questions.length !== [5, 3, 2][s.stage] ||
      !Array.isArray(s.records) ||
      s.records.length !== s.questions.length ||
      !Number.isInteger(s.index) ||
      s.index < 0 ||
      s.index > s.questions.length ||
      s.completed !== (s.index === s.questions.length) ||
      typeof s.reflection !== "string" ||
      s.reflection.length > 200 ||
      !Array.isArray(s.rewardIds)
    )
      throw Error("关卡不完整");
    s.questions.forEach((q) => {
      question(q);
      if (allQuestions.has(q.contentFingerprint) || allIds.has(q.instanceId))
        throw Error("发现重复题目记录");
      allQuestions.add(q.contentFingerprint);
      allIds.add(q.instanceId);
    });
    s.records.forEach((r) => record(r));
    for (let i = 0; i < s.index; i++)
      if (!s.records[i].mode) throw Error("缺少完成记录");
  }
  if (!Object.values(data.seen).every((v) => v === true))
    throw Error("题面历史不正确");
  if (data.active !== null && !data.sessions[data.active])
    throw Error("续做记录不正确");
  for (const q of data.queue)
    if (
      !q ||
      !templateIds.includes(q.templateId) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(q.due) ||
      ![0, 1, 2].includes(q.round)
    )
      throw Error("回收记录不正确");
  for (const [id, count] of Object.entries(data.inventory))
    if (
      !catalog.some((x) => x.id === id) ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      count > 100000
    )
      throw Error("库存不正确");
  const cells = new Set();
  for (const item of data.layout) {
    if (
      !Number.isInteger(item.cell) ||
      item.cell < 0 ||
      item.cell > 35 ||
      cells.has(item.cell) ||
      !catalog.some((x) => x.id === item.id) ||
      !Number.isInteger(item.rotation) ||
      item.rotation < 0 ||
      item.rotation > 3
    )
      throw Error("基地布局不正确");
    cells.add(item.cell);
  }
  for (const id of new Set(data.layout.map((x) => x.id)))
    if (
      data.layout.filter((x) => x.id === id).length > (data.inventory[id] || 0)
    )
      throw Error("库存不足");
  if (
    !["block", "shadow", "bounce"].includes(data.prefs.theme) ||
    !["ember", "mint", "violet"].includes(data.prefs.skin) ||
    typeof data.prefs.reduced !== "boolean" ||
    typeof data.prefs.jokes !== "boolean" ||
    !Array.isArray(data.clip.shots) ||
    data.clip.shots.length !== 3 ||
    !data.clip.shots.every((x) => characters.some(([id]) => id === x)) ||
    !["淡入", "切换", "滑动"].includes(data.clip.transition)
  )
    throw Error("偏好不正确");
  for (const [key, v] of Object.entries(data.ledger)) {
    if (
      !v ||
      key !== `${v.date}:stage-${v.stage}` ||
      !data.sessions[v.session]?.completed ||
      !Array.isArray(v.ids) ||
      v.ids.length > 3 ||
      new Set(v.ids).size !== v.ids.length ||
      v.session !== `${v.date}:${v.stage}` ||
      !v.ids.every((id) => catalog.some((x) => x.id === id))
    )
      throw Error("奖励记录不正确");
  }
  data.layoutHistory = Array.isArray(data.layoutHistory)
    ? data.layoutHistory.slice(-10)
    : [];
  for (const layout of data.layoutHistory) {
    if (
      !Array.isArray(layout) ||
      layout.length > 36 ||
      new Set(layout.map((x) => x?.cell)).size !== layout.length ||
      !layout.every(
        (x) =>
          x &&
          Number.isInteger(x.cell) &&
          x.cell >= 0 &&
          x.cell < 36 &&
          catalog.some((c) => c.id === x.id) &&
          Number.isInteger(x.rotation) &&
          x.rotation >= 0 &&
          x.rotation < 4,
      )
    )
      throw Error("撤销历史不正确");
  }
  return data;
}
export function mergeStates(current, incoming) {
  validate(incoming);
  const out = structuredClone(current);
  for (const [id, s] of Object.entries(incoming.sessions)) {
    const old = out.sessions[id];
    if (!old) out.sessions[id] = s;
    else if (
      old.questions.map((q) => q.contentFingerprint).join("|") ===
      s.questions.map((q) => q.contentFingerprint).join("|")
    ) {
      if (s.index > old.index) out.sessions[id] = s;
    } // Divergent sessions: preserve current, never silently swap questions.
  }
  Object.assign(out.seen, incoming.seen);
  for (const s of Object.values(out.sessions))
    for (const q of s.questions) out.seen[q.contentFingerprint] = true;
  for (const [key, entry] of Object.entries(incoming.ledger))
    if (!out.ledger[key] && out.sessions[entry.session]?.completed) {
      out.ledger[key] = entry;
      for (const id of entry.ids)
        out.inventory[id] =
          (out.inventory[id] || 0) + (entry.stage === 0 ? 2 : 1);
    }
  for (const q of incoming.queue)
    if (!out.queue.some((x) => x.templateId === q.templateId))
      out.queue.push(q);
  return validate(out);
}
