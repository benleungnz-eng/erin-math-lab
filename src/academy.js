import { partners, states } from "./partners.js";
import { learningDate } from "./engine/scheduler.js";
import { scienceQuestions, validateScienceSession } from "./content/science.js";
import { ensureHistory, validateHistory, mergeHistory } from "./history.js";
const validId = (id) => partners.some((p) => p.id === id);
export const starterPartners = ["ling", "gu", "kirby"];
export function migrateAcademy(data, returning = true) {
  if (data.academy) {
    const a = data.academy;
    ensureHistory(a);
    if (a.rosterVersion !== 2) {
      a.rosterResetFrom = [...a.unlocked];
      a.unlocked = [...starterPartners];
      if (!a.unlocked.includes(a.selected)) a.selected = "ling";
      a.rosterVersion = 2;
    }
    return a;
  }
  const unlocked = [...starterPartners];
  data.academy = {
    version: 1,
    rosterVersion: 2,
    selected: "ling",
    unlocked,
    stars: 0,
    rewards: {},
    effects: {},
    science: {
      sessions: {},
      active: { biology: null, geography: null },
      seen: {},
      nextDay: { biology: 0, geography: 0 },
    },
  };
  ensureHistory(data.academy);
  for (const s of Object.values(data.sessions)) s.partnerId ||= "ling";
  return data.academy;
}
export function awardPartner(data, s, subject = "math") {
  const a = migrateAcademy(data),
    key = `${subject}:${s.id}`;
  if (a.rewards[key]) return a.rewards[key];
  // The requested black egg is the next new unlock; keep Jax next and preserve all prior rewards.
  const next = [
    partners.find((p) => p.id === "blackegg"),
    partners.find((p) => p.id === "gen"),
    ...partners.filter((p) => !["blackegg", "gen"].includes(p.id)),
  ].find((p) => !a.unlocked.includes(p.id));
  const r = {
    subject,
    session: s.id,
    date: s.date,
    stage: s.stage,
    partner: next?.id || null,
    stars: next ? 0 : 1,
  };
  if (next) a.unlocked.push(next.id);
  else a.stars++;
  a.rewards[key] = r;
  s.partnerReward = r;
  return r;
}
export function selectPartner(data, id) {
  const a = migrateAcademy(data);
  if (!a.unlocked.includes(id)) throw Error("这个搭档还没有解锁");
  a.selected = id;
}
export function lockMathPartner(data, s) {
  const a = migrateAcademy(data);
  s.partnerId ||= a.selected;
  return s.partnerId;
}
export function startScience(data, subject, stage = 0, now = new Date()) {
  if (!["biology", "geography"].includes(subject) || ![0, 1].includes(stage))
    throw Error("不支持的学科或阶段");
  const a = migrateAcademy(data),
    b = a.science,
    old = b.sessions[b.active[subject]];
  if (old && !old.completed) return old;
  const date = learningDate(now),
    id = `${subject}:${date}:${stage}`;
  if (b.sessions[id]) {
    b.active[subject] = id;
    return b.sessions[id];
  }
  if (stage && !b.sessions[`${subject}:${date}:0`]?.completed)
    throw Error("先完成基础探索");
  if (!stage && b.nextDay[subject] >= 7)
    throw Error("七次探索已完成，新内容待更新。可以查看图鉴或选择其他学科。");
  const day = stage
    ? b.sessions[`${subject}:${date}:0`].day
    : b.nextDay[subject];
  const questions = scienceQuestions(subject, day, stage, date, b.seen);
  const s = {
    id,
    subject,
    date,
    stage,
    day,
    partnerId: a.selected,
    questions,
    records: questions.map(() => ({
      input: [],
      errors: 0,
      maxHint: 0,
      viewedExplanation: false,
      resolved: false,
      mode: null,
      guideIndex: 0,
      guideEvents: [],
      visited: [],
    })),
    index: 0,
    completed: false,
  };
  b.sessions[id] = s;
  b.active[subject] = id;
  return s;
}
export function scienceTarget(data, subject, token) {
  const b = data.academy.science,
    s = b.sessions[b.active[subject]];
  return s && !s.completed && s.id === token.session && s.index === token.index
    ? { s, q: s.questions[s.index], r: s.records[s.index] }
    : null;
}
export function submitScience(data, subject, token, value) {
  const t = scienceTarget(data, subject, token);
  if (!t || t.r.resolved) return { stale: true };
  if (!t.q.choices.includes(value)) return { valid: false };
  t.r.input = [value];
  const correct = value === t.q.answer;
  if (correct) {
    t.r.resolved = true;
    t.r.mode = t.r.maxHint ? "helped" : t.r.errors ? "retried" : "independent";
  } else t.r.errors++;
  return { valid: true, correct };
}
export function scienceHelp(data, subject, token, level) {
  const t = scienceTarget(data, subject, token);
  if (t && !t.r.resolved) {
    t.r.maxHint = Math.max(t.r.maxHint, level);
    if (level === 3) t.r.viewedExplanation = true;
  }
}
export function advanceScience(data, subject, token, defer = false) {
  const t = scienceTarget(data, subject, token);
  if (!t) return false;
  const { s, r } = t;
  if (!r.resolved && !r.viewedExplanation && !defer) return false;
  if (!r.mode) r.mode = defer ? "deferred" : "studied";
  s.index++;
  if (s.index === s.questions.length) {
    s.completed = true;
    if (!s.stage) data.academy.science.nextDay[subject]++;
    awardPartner(data, s, subject);
  }
  return true;
}
export function validateAcademy(data) {
  const a = data.academy;
  if (!a) return data;
  if (
    a.version !== 1 ||
    (a.rosterVersion !== undefined && a.rosterVersion !== 2) ||
    (a.rosterResetFrom !== undefined &&
      (!Array.isArray(a.rosterResetFrom) ||
        a.rosterResetFrom.length > partners.length ||
        !a.rosterResetFrom.every(validId))) ||
    !Array.isArray(a.unlocked) ||
    new Set(a.unlocked).size !== a.unlocked.length ||
    !a.unlocked.every(validId) ||
    !a.unlocked.includes(a.selected) ||
    !Number.isSafeInteger(a.stars) ||
    a.stars < 0 ||
    !a.science ||
    !a.rewards ||
    !a.effects
  )
    throw Error("搭档存档不完整");
  for (const s of Object.values(data.sessions))
    if (s.partnerId && !validId(s.partnerId)) throw Error("数学搭档记录无效");
  for (const [key, h] of Object.entries(a.effects))
    if (
      !validId(key.split(":")[0]) ||
      !Array.isArray(h) ||
      h.length > 3 ||
      !h.every((v) => Number.isInteger(v) && v >= 0 && v < 4) ||
      new Set(h).size !== h.length
    )
      throw Error("动作记录无效");
  const b = a.science;
  if (
    !b.sessions ||
    !b.seen ||
    !b.active ||
    !b.nextDay ||
    Object.keys(b.sessions).length > 12000
  )
    throw Error("学科存档无效");
  for (const subject of ["biology", "geography"])
    if (
      !Number.isSafeInteger(b.nextDay[subject]) ||
      b.nextDay[subject] < 0 ||
      (b.active[subject] !== null &&
        b.sessions[b.active[subject]]?.subject !== subject)
    )
      throw Error("学科进度无效");
  for (const [id, s] of Object.entries(b.sessions)) {
    if (id !== s.id || !validId(s.partnerId)) throw Error("学科搭档无效");
    validateScienceSession(s);
  }
  validateHistory(a);
  const scienceIds = new Set();
  for (const s of Object.values(b.sessions))
    for (const q of s.questions) {
      if (scienceIds.has(q.id) || b.seen[q.id] !== true)
        throw Error("科学题目重复或历史缺失");
      scienceIds.add(q.id);
    }
  if (!Object.values(b.seen).every((v) => v === true))
    throw Error("科学题面历史无效");
  for (const s of [
    ...Object.values(data.sessions),
    ...Object.values(b.sessions),
    ...Object.values(a.history?.sessions || {}),
  ])
    if (
      s.partnerReward &&
      JSON.stringify(s.partnerReward) !==
        JSON.stringify(a.rewards[`${s.subject || "math"}:${s.id}`])
    )
      throw Error("搭档奖励显示与账本不一致");
  if (a.stars !== Object.values(a.rewards).reduce((n, r) => n + r.stars, 0))
    throw Error("收藏星星与账本不一致");
  for (const [key, r] of Object.entries(a.rewards)) {
    const s =
      r.subject === "math"
        ? data.sessions[r.session]
        : r.subject === "history"
          ? a.history?.sessions[r.session]
          : b.sessions[r.session];
    if (
      key !== `${r.subject}:${r.session}` ||
      !s?.completed ||
      s.date !== r.date ||
      s.stage !== r.stage ||
      (r.partner !== null && !validId(r.partner)) ||
      r.stars !== (r.partner ? 0 : 1)
    )
      throw Error("搭档奖励记录无效");
  }
  return data;
}
export function mergeAcademy(out, incoming) {
  if (!incoming.academy) return;
  const a = migrateAcademy(out),
    b = structuredClone(incoming.academy);
  // Old pre-reset backups contribute learning evidence, not obsolete unlocks.
  migrateAcademy({ academy: b, sessions: incoming.sessions });
  a.unlocked = [...new Set([...a.unlocked, ...b.unlocked])];
  mergeHistory(a, b);
  for (const [id, s] of Object.entries(b.science.sessions)) {
    const old = a.science.sessions[id];
    if (
      !old ||
      (old.questions.map((q) => q.id).join("|") ===
        s.questions.map((q) => q.id).join("|") &&
        s.index > old.index)
    )
      a.science.sessions[id] = structuredClone(s);
  }
  Object.assign(a.science.seen, b.science.seen);
  for (const sub of ["biology", "geography"])
    a.science.nextDay[sub] = Math.max(
      a.science.nextDay[sub],
      b.science.nextDay[sub],
    );
  for (const [k, r] of Object.entries(b.rewards)) {
    const s =
      r.subject === "math"
        ? out.sessions[r.session]
        : r.subject === "history"
          ? a.history.sessions[r.session]
          : a.science.sessions[r.session];
    if (!a.rewards[k] && s?.completed) a.rewards[k] = structuredClone(r);
  }
  a.stars = Object.values(a.rewards).reduce((n, r) => n + r.stars, 0);
}
