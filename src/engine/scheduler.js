import { generate, hash, rng, templateIds } from "./templates.js";
import { plans } from "../content/schedule.js";
export function learningDate(now = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((t) => p.find((x) => x.type === t).value)
    .join("-");
}
export const addDays = (date, n) =>
  new Date(Date.parse(date + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export function fresh(templateId, seed, seen, kind = "base", strict = false) {
  const random = rng(seed);
  for (const id of strict
    ? [templateId]
    : [templateId, ...templateIds.filter((t) => t !== templateId)])
    for (let i = 0; i < 256; i++) {
      const q = generate(id, Math.floor(random() * 4294967296), kind);
      if (!seen[q.contentFingerprint]) return q;
    }
  throw Error("这个题型的不同题面暂时用完了，请保留备份后更新题库。");
}
export function stageQuestions(date, stage, seen, queue = []) {
  const day = Math.floor(Date.parse(date + "T00:00:00Z") / 86400000);
  const plan =
    stage === 0
      ? [...plans[((day % 14) + 14) % 14]]
      : stage === 1
        ? ["fraction", "bracket", "clip"]
        : ["substitute", "polynomial"];
  let reviewCount = 0;
  if (stage === 0)
    for (const item of queue.filter((x) => x.due <= date).slice(0, 2)) {
      plan[1 + reviewCount++] = item.templateId;
    }
  const local = { ...seen };
  return plan.map((t, i) => {
    const q = fresh(
      t,
      hash(`${date}:${stage}:${i}`),
      local,
      i > 0 && i <= reviewCount ? "review" : stage === 0 ? "base" : "extra",
    );
    local[q.contentFingerprint] = true;
    return q;
  });
}
