import {
  startHistory,
  historyTarget,
  submitHistory,
  helpHistory,
  advanceHistory,
} from "./history.js";
import { historyRows } from "./content/history.js";
import { escape as E } from "./components/visual.js";
import { learningDate } from "./engine/scheduler.js";
import { partnerLine } from "./partners.js";
export function historyProgress(a) {
  const sessions = Object.values(a.history?.sessions || {});
  const done = sessions.flatMap((s) =>
    s.questions.filter((q, i) => s.records[i].mode),
  );
  return {
    points: new Set(done.map((q) => q.point)).size,
    rows: new Set(done.map((q) => q.rowId)).size,
  };
}
export function historyCard(a) {
  const h = a.history,
    old = h?.sessions[h.active],
    p = historyProgress(a);
  return `<article class="card subject-history"><span class="subject-icon">卷</span><h2>历史 · 时光线索局</h2><p>每天61道小填空，覆盖全部27个知识点；每天换个挖空位置。可以分段完成。知识点已探索 ${p.points}/27，线索 ${p.rows}/${historyRows.length}。</p><button id="startHistory" class="primary">${old && !old.completed && old.date === learningDate() ? "继续上次历史探索" : h?.sessions[`history:${learningDate()}:0`]?.completed ? "看看今天的历史收获" : "开始今天的历史 →"}</button></article>`;
}
export function historyProgressHTML(a) {
  const p = historyProgress(a),
    sessions = Object.values(a.history?.sessions || {});
  return `<section class="card"><h2>历史 · 时光线索局</h2><p>已探索 ${p.points}/27 个知识点，${p.rows}/${historyRows.length} 条线索。每天覆盖全部知识点，轮换挖空位置；随时暂停，当天可以接着做。</p><ol class="history-coverage">${Array.from({ length: 27 }, (_, i) => `<li>知识点${i + 1} · ${sessions.some((s) => s.questions.some((q, j) => q.point === i + 1 && s.records[j].mode)) ? "已探索" : "待探索"}</li>`).join("")}</ol>${
    sessions
      .slice()
      .reverse()
      .map(
        (s) =>
          `<details><summary>${E(s.date)} · ${"每日全量复习"} · ${s.index}/${s.questions.length}</summary>${s.questions.map((q, i) => `<article><h3>${E(q.topic)}</h3><p>${E(q.prompt)}</p><p>完成方式：${{ independent: "独立首次答对", retried: "重试后答对", helped: "提示后完成", studied: "看讲解学习", deferred: "稍后再练" }[s.records[i].mode] || "进行中"} · 求助 ${s.records[i].maxHint} 级 · 正式答错 ${s.records[i].errors} 次</p><details><summary>回看原句与联想图</summary><img class="history-image" src="${q.image}" alt="${q.imageAlt}" loading="lazy"><p>${E(q.text)}</p><p>${E(q.memory)}</p><p class="caption">虚构搭档参与记忆小剧场；插画不作为史料。</p></details></article>`).join("")}</details>`,
      )
      .join("") || "<p>还没有历史练习记录。</p>"
  }</section>`;
}
export function createHistoryUI({
  db,
  main,
  action,
  notify,
  go,
  panel,
  event,
  rewardHTML,
  reportPreview,
}) {
  const current = () => {
    const h = db.state.academy.history;
    return h?.sessions[h.active];
  };
  async function start(stage = 0) {
    try {
      await action((d) => startHistory(d, stage), false);
      go("history");
      await event("greet");
    } catch (e) {
      notify(e.message);
    }
  }
  function page() {
    const s = current();
    if (!s) {
      go("home");
      return;
    }
    if (s.completed) {
      summary(s);
      return;
    }
    const q = s.questions[s.index],
      r = s.records[s.index],
      token = { session: s.id, index: s.index };
    const blanks = q.segments
      .map(
        (seg, i) =>
          E(seg) +
          (i < q.answers.length
            ? `<span class="history-slot"><label for="historyBlank${i}" class="sr-only">第${i + 1}空</label><${q.answers[i].length > 12 ? "textarea" : "input"} id="historyBlank${i}" data-history-blank="${i}" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="240" aria-label="第${i + 1}空" aria-describedby="historyCheck${i}" ${q.answers[i].length > 12 ? "" : `value="${E(r.input[i])}"`} ${r.resolved ? "readonly" : ""}>${q.answers[i].length > 12 ? E(r.input[i]) + "</textarea>" : ""}<small id="historyCheck${i}" class="history-check" aria-live="polite">${r.checked[i] === true ? "这空对上了 ✓" : r.checked[i] === false ? "这空再想想" : "第" + (i + 1) + "空"}</small></span>`
            : ""),
      )
      .join("");
    main.innerHTML = `<section class="card" data-history-index="${s.index}"><div class="row"><div><p class="eyebrow">历史 · 时光线索局 · ${"每日全量复习"}</p><h1>${E(q.topic)}</h1><p>复习资料第1～10课 · 知识点${q.point} · ${s.index + 1}/${s.questions.length}</p></div><button id="historyHome">暂时回航站</button></div>${panel(s.partnerId, r.resolved ? "correct" : "thinking")}<div class="science-layout history-layout"><figure><img class="history-image" src="${q.image}" alt="${q.imageAlt}" width="960" height="640"><figcaption class="caption">虚构搭档参与记忆小剧场；插画不作为史料。先看场景，再补关键词。</figcaption></figure><section><p class="history-context">${q.point === 10 ? "本组知识点：商朝。" : ""}原句填空 · 可用中文键盘或系统手写输入</p><form id="historyForm"><div class="history-cloze">${blanks}</div><div class="actions"><button type="submit" id="historySubmit" class="primary" ${r.resolved ? "hidden" : ""}>✓ 逐空检查</button><button type="button" id="historyNext" class="gold" ${r.resolved ? "" : "hidden"}>下一题 →</button></div></form><p id="historyFeedback" class="feedback" role="status">${r.resolved ? "线索接上了，点下一题继续。" : "每次只想一个空，不会也可以让搭档帮忙。"}</p><div class="actions learning-help"><button id="historyHint1">✦ 一点思路</button><button id="historyHint2">▤ 关键线索</button><button id="historyExplain">♡ 我不会，直接看讲解</button><button id="historyLater">↻ 稍后再练</button></div>${r.maxHint >= 1 ? `<section class="step"><h3>先搭一条记忆线</h3><p>${E(partnerLine(s.partnerId, "hint_light", 0, q.hints[0]))}</p></section>` : ""}${r.maxHint >= 2 ? `<section class="step"><h3>再靠近一点</h3><p>${E(partnerLine(s.partnerId, "hint_step", 0, q.hints[1]))}</p></section>` : ""}${r.maxHint >= 3 ? `<section class="step" id="historySolution"><h3>完整答案 · 把线索串起来</h3><p>${E(partnerLine(s.partnerId, "solution", 0))}</p><ol>${q.answers.map((a, i) => `<li>第${i + 1}空：<strong>${E(a)}</strong></li>`).join("")}</ol><p>${E(q.text)}</p><p>${E(q.memory)}</p><p class="caption">查看答案不扣奖励，也不会算成独立首次答对。</p><button id="historyStudied">这题先学到这里 →</button></section>` : ""}</section></div></section>`;
    main.querySelector("#historyHome").onclick = () => go("home");
    let saving = Promise.resolve(),
      composing = false;
    main.querySelectorAll("[data-history-blank]").forEach((input) => {
      const save = () => {
        const i = Number(input.dataset.historyBlank),
          value = input.value;
        saving = db.mutate((d) => {
          const t = historyTarget(d, token);
          if (t && !t.r.resolved) {
            t.r.input[i] = value;
            t.r.checked[i] = null;
          }
        });
        main.querySelector(`#historyCheck${i}`).textContent = `第${i + 1}空`;
      };
      input.addEventListener("compositionstart", () => {
        composing = true;
      });
      input.oninput = (e) => {
        if (!e.isComposing) save();
      };
      input.addEventListener("compositionend", () => {
        composing = false;
        save();
      });
    });
    main.querySelector("#historyForm").onsubmit = async (e) => {
      e.preventDefault();
      if (composing) return;
      const values = [...main.querySelectorAll("[data-history-blank]")].map(
        (i) => i.value,
      );
      await saving;
      const result = await action(
        (d) => submitHistory(d, token, values),
        false,
      );
      if (result?.stale) return;
      if (!result?.valid) {
        main.querySelector("#historyFeedback").textContent =
          "先补齐每个空，再一起检查；也可以直接看讲解。";
        return;
      }
      page();
      main.querySelector("#historyFeedback").textContent = result.correct
        ? "全部线索都接上了！"
        : `${result.checked.filter(Boolean).length}/${q.answers.length} 空已对上。保留答对的，再想想其他空。`;
      await event(
        result.correct
          ? "correct"
          : current().records[s.index].errors > 1
            ? "retry"
            : "wrong",
      );
    };
    for (const [id, level, name] of [
      ["historyHint1", 1, "hint_light"],
      ["historyHint2", 2, "hint_step"],
      ["historyExplain", 3, "solution"],
    ])
      main.querySelector("#" + id).onclick = async () => {
        await saving;
        await action((d) => helpHistory(d, token, level), false);
        page();
        await event(name);
      };
    const advance = async (defer) => {
      await saving;
      await action((d) => advanceHistory(d, token, defer), false);
      page();
      if (current()?.completed)
        await event(current().partnerReward?.partner ? "unlock" : "complete");
    };
    main.querySelector("#historyNext").onclick = () => advance(false);
    main.querySelector("#historyLater").onclick = () => advance(true);
    if (main.querySelector("#historyStudied"))
      main.querySelector("#historyStudied").onclick = () => advance(false);
  }
  function summary(s) {
    const counts = {};
    s.records.forEach((r) => (counts[r.mode] = (counts[r.mode] || 0) + 1));
    main.innerHTML = `<section class="card"><h1>这一段时光探索完成了。</h1>${panel(s.partnerId, "complete")}<p>独立首次答对 ${counts.independent || 0} · 重试后答对 ${counts.retried || 0} · 提示后完成 ${counts.helped || 0} · 看讲解学习 ${counts.studied || 0} · 稍后再练 ${counts.deferred || 0}。</p>${rewardHTML(s)}<div class="actions"><button id="historyFinish" class="primary">今天到这里</button><button id="historyShare">发给爸爸 · 学习报告</button><button id="historyProgress">看看历史进度</button></div><p>看提示、看答案也获得完整奖励。今天不用做其他科。</p></section>`;
    main.querySelector("#historyFinish").onclick = () => go("home");
    main.querySelector("#historyShare").onclick = () => reportPreview(s.date);
    main.querySelector("#historyProgress").onclick = () => go("progress");
    if (main.querySelector("#historyBonus"))
      main.querySelector("#historyBonus").onclick = () => start(1);
  }
  return { page, start, current };
}
