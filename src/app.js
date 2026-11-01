import { createAcademyUI } from "./academy-ui.js";
import { lockMathPartner } from "./academy.js";
import { partners, partnerArt, partnerById, partnerLine } from "./partners.js";
import { subjects } from "./content/science.js";
import { reportTypeName } from "./reports.js";
import { presentQuestion, answerInstructions } from "./algebra-presentation.js";
import { characters, sprite, banter } from "./characters.js";
import {
  makeReport,
  validateReport,
  readReports,
  importReport,
  summarize,
  modeNames,
} from "./reports.js";
import { Database } from "./storage/database.js";
import {
  activeSession,
  begin,
  target,
  submit,
  help,
  advance,
  makePractice,
  validate,
  answerQuestion,
} from "./storage/state.js";
import { generate, templateIds, names, hash } from "./engine/templates.js";
import { learningDate } from "./engine/scheduler.js";
import { parse, equal, show } from "./engine/rational.js";
import { catalog, skins } from "./world/catalog.js";
import { editWorld } from "./world/actions.js";
import { sketch } from "./components/sketch.js";
import { escape as E, visual } from "./components/visual.js";
const $ = (s) => document.querySelector(s),
  main = $("#main");
function notify(message) {
  $("#notice").hidden = false;
  $("#notice").textContent = message;
}
const db = new Database(notify);
await db.open();
let view = location.hash === "#reports" ? "reports" : "home",
  busy = false,
  token = null,
  practiceMode = false,
  activeInput = null,
  selectedItem = "tree",
  selectedCell = null,
  previewCell = null,
  moving = false,
  studioTimer = null,
  studioFrame = 0,
  eraseMode = false;
const state = () => db.state;
const session = () => activeSession(state());
const tokenNow = () => {
  const s = session();
  return s && !s.completed
    ? {
        session: s.id,
        index: s.index,
        question: s.questions[s.index].instanceId,
      }
    : null;
};
async function action(fn, redraw = true) {
  if (busy) return;
  busy = true;
  const buttons = [...main.querySelectorAll("button,input,select")].map((b) => [
    b,
    b.disabled,
  ]);
  for (const [b] of buttons) b.disabled = true;
  try {
    const result = await db.mutate(fn);
    if (redraw) render();
    return result;
  } catch (e) {
    notify(e.message);
  } finally {
    busy = false;
    for (const [b, disabled] of buttons)
      if (b.isConnected) b.disabled = disabled;
  }
}
function modal(html) {
  $("#dialogBody").innerHTML = html;
  $("#dialog").showModal();
}
$("#closeDialog").onclick = () => $("#dialog").close();
const buddy = (id, name, pose = 0) =>
  `<div class="companion">${sprite(id, pose)}<p>${E(name)}</p></div>`;
function feedbackText(r) {
  if (!r.resolved && !r.mode) return "";
  if (r.mode === "studied")
    return "这题学完了。看懂一步也是进步，可以进入下一题。";
  if (r.mode === "deferred") return "已留到稍后再练。";
  return `答对了！${{ independent: "这题你独立完成了。", retried: "重新检查后做对了。", helped: "借助提示，你也把这题做对了。" }[r.mode] || ""} 点击“下一题 →”继续。`;
}
function celebrate() {
  const slot = $("#feedback");
  if (!slot) return;
  const node = document.createElement("div");
  node.className = "correct-celebration";
  node.setAttribute("aria-hidden", "true");
  node.innerHTML =
    partnerArt(
      session()?.partnerId || state().academy.selected,
      "correct_small",
    ) + '<span class="confetti">✦ · ✧ · ✦</span>';
  slot.append(node);
  setTimeout(() => node.remove(), 1300);
}
function instructionText(kind) {
  const text =
    kind === "world"
      ? "这是装饰基地的小空间。① 在仓库选物件；② 点空格预览；③ 确认放下。点已有物件可旋转、移动或收回。旧物件完整保留，随时能玩。新版完成练习解锁搭档，不再发新摆件。"
      : "这是三张角色画面的短片实验台。① 每格选一个角色；② 点换位调整顺序；③ 选择转场，再播放。它不需要做题解锁，只在本机预览，不会生成或上传视频。";
  return text;
}
function instructions(kind) {
  modal(
    `<h2>${kind === "world" ? "基地怎么玩？" : "三格短片怎么玩？"}</h2><p>${instructionText(kind)}</p>`,
  );
  try {
    localStorage.setItem("erin-tutorial-" + kind, "seen");
  } catch {
    /* still usable without storage */
  }
}
function bindInstructions(kind) {
  $("#howToPlay").onclick = () => instructions(kind);
  try {
    if (!localStorage.getItem("erin-tutorial-" + kind)) {
      const note = document.createElement("details");
      note.open = true;
      note.className = "tutorial card";
      note.innerHTML = `<summary>第一次玩？先看这里</summary><p>${instructionText(kind)}</p>`;
      main.prepend(note);
      localStorage.setItem("erin-tutorial-" + kind, "seen");
    }
  } catch {
    /* inline instructions remain visible */
  }
}
const academyUI = createAcademyUI({
  db,
  main,
  action,
  modal,
  notify,
  download,
  reportPreview: (date) => reportPreview(makeReport(state(), date), date),
  go: async (destination) => {
    if (destination === "math") {
      await action((d) => {
        const s = begin(d, 0);
        lockMathPartner(d, s);
      }, false);
      view = "learn";
      practiceMode = false;
      render();
      await academyUI.mathEvent("greet");
    } else {
      view = destination;
      practiceMode = false;
      render();
    }
  },
});
async function advanceMath(deferred = false) {
  await action((d) => advance(d, token, deferred));
  const s = session();
  if (s?.completed)
    await academyUI.mathEvent(
      s.partnerReward?.partner ? "unlock" : s.stage ? "bonus" : "complete",
    );
}
function render() {
  clearInterval(studioTimer);
  studioTimer = null;
  document.body.className = `theme-${state().prefs.theme} skin-${state().prefs.skin} ${state().prefs.reduced ? "reduced" : ""}`;
  document
    .querySelectorAll("[data-view]")
    .forEach((b) => b.setAttribute("aria-pressed", b.dataset.view === view));
  if (view === "learn") renderLearn();
  else if (view === "world") renderWorld();
  else if (view === "studio") renderStudio();
  else if (view === "settings") renderSettings();
  else if (view === "reports") renderParentReports();
  else if (view === "science") academyUI.sciencePage();
  else if (view === "collection") academyUI.collection();
  else if (view === "progress") academyUI.progress();
  else renderHome();
}
for (const b of document.querySelectorAll("[data-view]"))
  b.onclick = () => {
    view = b.dataset.view;
    history.replaceState(
      null,
      "",
      view === "reports" ? "#reports" : location.pathname,
    );
    practiceMode = false;
    render();
  };
window.addEventListener("storage", (e) => {
  if (e.key === "erin-parent-reports-v1" && view === "reports")
    renderParentReports();
});
db.onchange = () => {
  render();
  notify("已接上另一页面保存的最新进度。");
};
function renderHome() {
  academyUI.home();
}
function currentRecord(data = state()) {
  const t = target(data, token);
  if (!t) return null;
  return practiceMode ? t.r.practice?.record : t.r;
}
function currentQuestion() {
  const t = target(state(), token);
  return practiceMode ? t?.r.practice?.question : t?.q;
}
async function changeRecord(fn, redraw = true) {
  const captured = { ...token },
    isPractice = practiceMode;
  const mutation = (d) => {
    const t = target(d, captured);
    if (t) {
      const r = isPractice ? t.r.practice?.record : t.r;
      const q = isPractice ? t.r.practice?.question : t.q;
      if (r) fn(r, q, t.s);
    }
  };
  if (!redraw) return db.mutate(mutation).catch((e) => notify(e.message));
  return action(mutation, true);
}
function renderLearn() {
  const s = session();
  if (!s) {
    view = "home";
    renderHome();
    return;
  }
  if (s.completed) {
    renderSummary(s);
    return;
  }
  token = tokenNow();
  const mainRecord = s.records[s.index];
  if (practiceMode && !mainRecord.practice) practiceMode = false;
  const r = currentRecord(),
    q = presentQuestion(currentQuestion());
  main.innerHTML = `<section class="card"><div class="row"><div><p class="eyebrow">${practiceMode ? "TRY A NEW NUMBER / 自愿迁移题" : "DAILY SIDE QUEST / " + ["基础 5 题", "自愿加练 3 题", "自愿加练 2 题"][s.stage]}</p><h2>${practiceMode ? "换一组数字，试着自己接上。" : "每次接上一小段。"}</h2></div><span class="pill">${s.date} · ${practiceMode ? "不计入基础题数" : `${s.index + 1} / ${s.questions.length}`}</span></div><div class="progress">${s.questions.map((_, i) => `<span class="${i < s.index ? "done" : ""}"></span>`).join("")}</div><div class="practice-layout"><section><p class="question-label">${names[templateIds.indexOf(q.templateId)]} · ${q.kind === "review" ? "换数字再遇见" : q.difficulty === 3 ? "多步拼接" : q.difficulty === 2 ? "接上两步" : "轻轻热身"}</p>${q.context ? `<p class="caption">${E(q.context)}</p>` : ""}<h2 class="question">${E(q.prompt)}</h2>${visual(q, r)}${answerInstructions(q) ? `<div class="answer-instructions" id="answerInstructions"><strong>分栏怎么填？</strong><p>${E(answerInstructions(q))}</p></div>` : ""}<div id="answerArea">${q.choices ? `<div class="actions">${q.choices.map((c) => `<button class="choice" data-choice="${E(c)}" aria-pressed="${r.input[0] === c}">${E(c)}</button>`).join("")}</div>` : `<div class="answer-grid">${q.labels.map((label, i) => `<label>${E(label)}<input class="answer" data-answer="${i}" aria-label="${E(label)}" ${answerInstructions(q) ? 'aria-describedby="answerInstructions"' : ""} autocomplete="off" maxlength="30" value="${E(r.input[i] || "")}" ${r.resolved ? "disabled" : ""}></label>`).join("")}</div><p class="caption">整数 / 小数 / 分数均可，例如 −2、0.5、1/2。代数题只填每栏对应的数。</p><div class="keypad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "−", ".", "/", "⌫", "清空"].map((k) => `<button data-key="${k}" aria-label="键盘 ${k}">${k === "/" ? "分数 /" : k}</button>`).join("")}</div>`}</div><div class="actions"><button class="primary" id="submitAnswer" ${r.resolved ? "hidden" : ""}><span class="button-icon" aria-hidden="true">✓</span>检查答案</button><button class="gold" id="nextQuestion" ${r.resolved ? "" : "hidden"}>${practiceMode ? "返回原题" : "下一题 →"}</button></div><div class="feedback" id="feedback" role="status">${E(feedbackText(r))}${r.resolved && q.simplifiedExpression ? `<p class="simplified-result">化简结果：<strong>${E(q.simplifiedExpression)}</strong></p>` : ""}</div><div class="actions learning-help"><button id="hint1"><span class="button-icon" aria-hidden="true">✦</span>一点思路</button><button id="hint2"><span class="button-icon" aria-hidden="true">▤</span>带我一步一步做 · 推荐</button><button id="explain"><span class="button-icon" aria-hidden="true">♡</span>我不会，直接看讲解</button><button id="later"><span class="button-icon" aria-hidden="true">↻</span>${practiceMode ? "跳过这道小题" : "稍后再练"}</button></div><div id="helpArea">${helpHTML(q, r)}</div></section><aside><div class="row"><h3>手写停靠区</h3><button id="collapseSketch"><span class="button-icon" aria-hidden="true">▱</span>展开 / 收起</button></div><p class="caption">只供思考，不识别、不上传。当前题会保存；切到下一题后清理这页草稿。</p><div class="sketch-tools"><button id="pen" aria-pressed="true"><span class="button-icon" aria-hidden="true">✎</span>笔</button><button id="eraser"><span class="button-icon" aria-hidden="true">◇</span>橡皮</button><button id="undoInk"><span class="button-icon" aria-hidden="true">↶</span>撤销</button><button id="clearInk"><span class="button-icon" aria-hidden="true">⌫</span>清空</button></div><canvas class="sketch" aria-label="当前题手写草稿"></canvas><div class="companions">${academyUI.mathPanel(s)}</div><p class="caption">${state().prefs.jokes ? E(partnerLine(s.partnerId || state().academy.selected, "thinking", 0, banter[q.templateId][1])) : "每一步都可以慢慢检查。"}</p></aside></div></section>`;
  bindAnswers(q, r);
  bindHelp(q, r);
  const ink = sketch($("canvas"), r, (lines) =>
    changeRecord((record) => (record.draft = lines), false),
  );
  $("#pen").onclick = () => {
    eraseMode = false;
    ink.erase(false);
    $("#pen").setAttribute("aria-pressed", "true");
    $("#eraser").setAttribute("aria-pressed", "false");
  };
  $("#eraser").onclick = () => {
    eraseMode = true;
    ink.erase(true);
    $("#pen").setAttribute("aria-pressed", "false");
    $("#eraser").setAttribute("aria-pressed", "true");
  };
  $("#undoInk").onclick = ink.undo;
  $("#clearInk").onclick = ink.clear;
  let collapsed = false;
  $("#collapseSketch").onclick = () => ink.collapse((collapsed = !collapsed));
  const strip = main.querySelector(".axis"),
    marker = strip?.querySelector(".current");
  if (strip && marker)
    strip.scrollLeft =
      marker.offsetLeft -
      strip.offsetLeft -
      strip.clientWidth / 2 +
      marker.clientWidth / 2;
  document.querySelectorAll("[data-axis]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#axisMessage").textContent =
          `你停在 ${b.dataset.axis} · 到 0 的距离 ${Math.abs(Number(b.dataset.axis))}。${Number(b.dataset.axis) === q.visual.position ? "与题目目标相同。" : "再对照题目需要的位置。"}`;
        document
          .querySelectorAll("[data-axis]")
          .forEach((x) => x.classList.toggle("current", x === b));
      }),
  );
  document.querySelectorAll("[data-term]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#termMessage").textContent =
          `${b.dataset.term} 属于${q.visual.cards.find((c) => c.text === b.dataset.term).group}。${b.dataset.term.includes("x") || b.dataset.term.includes("b") ? "保留字母，只合并系数。" : "它是一个单独数字，不改变变量系数。"}`;
      }),
  );
}
function helpHTML(q, r) {
  let html = "";
  if (r.maxHint >= 1)
    html += `<section class="hint-section"><h3>① 先观察</h3><p class="muted">${E(q.observation.prompt)}</p><div class="actions">${q.observation.choices.map((c) => `<button data-observe="${E(c)}">${E(c)}</button>`).join("")}</div><p id="observationFeedback" class="caption">${E(r.guideValues.observationFeedback || "先作一个小决定，再看看它为什么成立。")}</p></section>`;
  if (r.maxHint >= 2) {
    const step = q.guidedSteps[r.guideIndex];
    html += `<section class="hint-section"><h3>② 一步一步搭</h3><div class="steps-history">${r.guideEvents.map((e) => `<p>${E((e.mode === "demonstrated" ? "看过这一步示范：" : "这一步对了！") + q.guidedSteps[e.index]?.feedback)} <small>（${{ independent: "自己完成这一步", helped: "局部提示后完成", demonstrated: "看过这一步示范" }[e.mode]}）</small></p>`).join("")}</div>${
      step
        ? `<div class="step"><p class="math">${E(step.prompt)}</p>${
            step.type === "choice"
              ? `<div class="actions">${step.choices.map((c) => `<button data-guide-choice="${E(c)}">${E(c)}</button>`).join("")}</div>`
              : step.type === "groups"
                ? `<div id="groups">${q.visual.cards.map((c, i) => `<label>${E(c.text)}<select data-group="${i}"><option value="">放到…</option><option ${r.guideValues[`group:${r.guideIndex}:${i}`] === "变量项" ? "selected" : ""}>变量项</option><option ${r.guideValues[`group:${r.guideIndex}:${i}`] === "常数项" ? "selected" : ""}>常数项</option></select></label>`).join("")}</div><button id="checkGroups">看看分类</button>`
                : step.type === "axis"
                  ? `<div class="actions">${Array.from(
                      { length: 25 },
                      (_, i) => i - 12,
                    )
                      .map(
                        (n) => `<button data-guide-choice="${n}">${n}</button>`,
                      )
                      .join("")}</div>`
                  : `<input id="guideInput" aria-label="当前小步骤答案" value="${E(r.guideValues[r.guideIndex] || "")}" autocomplete="off"><button id="checkGuide">接上这一步</button>`
          }<p id="guideFeedback" class="feedback" role="status"></p><div class="actions"><button id="demoStep">先示范这一个小步骤</button></div></div>`
        : '<p class="feedback">关键步骤已经接上。回到普通式子试着填写，或直接回看完整解法。</p>'
    }</section>`;
  }
  if (r.maxHint >= 3)
    html += `<section class="hint-section"><h3>③ 完整分步解法</h3>${q.explanation.map((s, i) => `<div class="step"><p class="math">${i + 1}. ${E(s.math)}</p><p>${E(s.detail)}</p>${i === 0 ? `<p class="explanation-note">${E(banter[q.templateId][1])}</p>${state().prefs.jokes ? `<p class="caption">${E(partnerLine(session().partnerId || state().academy.selected, "solution", 0, banter[q.templateId][1]))}</p>` : ""}` : ""}</div>`).join("")}<p class="caption">这是讲解陪伴学习，不计为独立首次答对。</p><div class="actions"><button id="finishStudying" class="primary">${practiceMode ? "这道小题先学到这里" : "这题先学到这里"}</button>${!practiceMode ? `<button id="transfer">${r.practice ? "继续换数字的小题" : "自愿试一道换数字的小题"}</button>` : ""}</div></section>`;
  return html;
}
function bindAnswers(q, r) {
  const inputs = [...document.querySelectorAll("[data-answer]")];
  activeInput = inputs[0] || null;
  const touch = navigator.maxTouchPoints > 0;
  for (const input of inputs) {
    input.onfocus = () => (activeInput = input);
    if (touch) {
      input.readOnly = true;
      input.inputMode = "none";
    }
    input.oninput = () => saveInput();
    input.onkeydown = (e) => {
      if (e.key === "Enter") $("#submitAnswer").click();
    };
  }
  function values() {
    return q.choices ? r.input : inputs.map((x) => x.value);
  }
  function saveInput() {
    const v = inputs.map((x) => x.value);
    changeRecord((record) => (record.input = v), false);
  }
  document.querySelectorAll("[data-choice]").forEach(
    (b) =>
      (b.onclick = () =>
        changeRecord((record) => {
          if (!record.resolved) record.input = [b.dataset.choice];
        })),
  );
  document.querySelectorAll("[data-key]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!activeInput || activeInput.disabled) return;
        const k = b.dataset.key;
        activeInput.value =
          k === "清空"
            ? ""
            : k === "⌫"
              ? activeInput.value.slice(0, -1)
              : activeInput.value + (k === "−" ? "-" : k);
        activeInput.focus();
        if (activeInput.id === "guideInput") activeInput.oninput();
        else saveInput();
      }),
  );
  $("#submitAnswer").onclick = async () => {
    const v = q.choices ? currentRecord().input : values();
    let result;
    if (practiceMode) {
      await changeRecord((record, question) => {
        if (record.resolved) return;
        result = answerQuestion(question, v);
        record.input = v;
        if (result.valid) {
          if (result.correct) {
            record.resolved = true;
            record.mode = record.maxHint
              ? "helped"
              : record.errors
                ? "retried"
                : "independent";
          } else record.errors++;
        }
      }, false);
    } else result = await action((d) => submit(d, token, v), false);
    if (!result || result.stale) return;
    if (!result.valid) {
      $("#feedback").textContent =
        "先把答案填完整。分母不能为 0；每栏填一个数，不填整个算式。";
      return;
    }
    if (result.correct) {
      renderLearn();
      const chain = session()
        .records.slice(0, session().index + 1)
        .reverse()
        .findIndex((x) => x.mode !== "independent");
      const streak = chain < 0 ? session().index + 1 : chain;
      await academyUI.mathEvent(
        streak === 5 ? "streak5" : streak === 3 ? "streak3" : "correct",
      );
      celebrate();
    } else {
      $("#feedback").textContent =
        "这次还没对上，先保留你的想法。核对一个符号或步骤，也可以让搭档陪你拆一步。";
      await academyUI.mathEvent(currentRecord().errors > 1 ? "retry" : "wrong");
    }
  };
  $("#nextQuestion").onclick = () => {
    if (practiceMode) {
      practiceMode = false;
      renderLearn();
    } else advanceMath();
  };
  $("#later").onclick = () => {
    if (practiceMode) {
      practiceMode = false;
      renderLearn();
    } else advanceMath(true);
  };
}
function bindHelp(q, r) {
  document.querySelectorAll("[data-observe]").forEach(
    (b) =>
      (b.onclick = () => {
        const correct = b.dataset.observe === q.observation.expected;
        const feedback = correct
          ? "这一步对了！" + q.observation.feedback
          : "先不用急着选，再看看这一步的对象；可以点“带我一步一步做”，把这里拆小。";
        changeRecord(
          (record) => (record.guideValues.observationFeedback = feedback),
          false,
        );
        $("#observationFeedback").textContent = feedback;
      }),
  );
  for (const [id, level] of [
    ["hint1", 1],
    ["hint2", 2],
    ["explain", 3],
  ])
    $("#" + id).onclick = async () => {
      if (practiceMode)
        await changeRecord((record) => {
          record.maxHint = Math.max(record.maxHint, level);
          if (level === 3) {
            record.viewedExplanation = true;
            record.requestedHelp = true;
          }
        });
      else await action((d) => help(d, token, level, id === "explain"));
      await academyUI.mathEvent(
        level === 1 ? "hint_light" : level === 2 ? "hint_step" : "solution",
        level < 3 ? q.observation.feedback : "",
      );
    };
  async function guided(value, demo = false) {
    const step = q.guidedSteps[r.guideIndex];
    if (!step) return;
    let correct = demo;
    if (!demo) {
      if (step.type === "groups")
        correct = q.visual.cards.every(
          (c, i) =>
            document.querySelector(`[data-group="${i}"]`).value === c.group,
        );
      else if (step.type === "input")
        correct = equal(parse(value), parse(step.expected));
      else correct = value === step.expected;
    }
    if (!correct) {
      await changeRecord((record) => {
        record.guideValues["tries:" + record.guideIndex] = true;
        record.guideValues[record.guideIndex] = value || "";
      }, false);
      $("#guideFeedback").textContent =
        "这个选择还需要再看看。可以点“示范这一个小步骤”，先把这里弄清楚；不会增加整题错误次数。";
      return;
    }
    await changeRecord((record) => {
      if (record.guideIndex !== r.guideIndex) return;
      record.guideEvents.push({
        index: record.guideIndex,
        mode: demo
          ? "demonstrated"
          : record.guideValues["tries:" + record.guideIndex]
            ? "helped"
            : "independent",
      });
      record.guideIndex++;
    });
  }
  document
    .querySelectorAll("[data-guide-choice]")
    .forEach((b) => (b.onclick = () => guided(b.dataset.guideChoice)));
  if ($("#checkGuide"))
    $("#checkGuide").onclick = () => guided($("#guideInput").value);
  if ($("#guideInput"))
    $("#guideInput").oninput = () => {
      const value = $("#guideInput").value;
      changeRecord(
        (record) => (record.guideValues[record.guideIndex] = value),
        false,
      );
    };
  document.querySelectorAll("[data-group]").forEach(
    (select) =>
      (select.onchange = () => {
        const value = select.value,
          index = select.dataset.group;
        changeRecord(
          (record) =>
            (record.guideValues[`group:${record.guideIndex}:${index}`] = value),
          false,
        );
      }),
  );
  if ($("#guideInput")) {
    $("#guideInput").onfocus = () => (activeInput = $("#guideInput"));
    if (navigator.maxTouchPoints > 0) {
      $("#guideInput").readOnly = true;
      $("#guideInput").inputMode = "none";
    }
  }
  if ($("#checkGroups")) $("#checkGroups").onclick = () => guided("sorted");
  if ($("#demoStep")) $("#demoStep").onclick = () => guided("", true);
  if ($("#finishStudying"))
    $("#finishStudying").onclick = async () => {
      if (practiceMode) {
        await changeRecord((record) => {
          if (!record.resolved) {
            record.resolved = true;
            record.mode = "studied";
          }
        });
      } else {
        await action((d) => {
          const t = target(d, token);
          if (t && !t.r.resolved) {
            t.r.resolved = true;
            t.r.mode = "studied";
          }
        });
      }
    };
  if ($("#transfer"))
    $("#transfer").onclick = async () => {
      await action((d) => makePractice(d, token), false);
      practiceMode = true;
      renderLearn();
    };
}
function renderSummary(s) {
  const counts = {
    independent: 0,
    retried: 0,
    helped: 0,
    studied: 0,
    deferred: 0,
  };
  s.records.forEach((r) => counts[r.mode]++);
  main.innerHTML = `<section class="card"><p class="eyebrow">TODAY IS ENOUGH</p><div class="celebrate" aria-hidden="true">✦</div><h1>${s.stage === 0 ? "今天已经完成。" : "这段也接好了。"}</h1><p class="muted">${s.questions.length} 题学习流程已走完，提示和讲解都算认真参与。现在可以收工，或去图鉴看看新搭档。</p><p>独立首次完成 ${counts.independent} · 重试完成 ${counts.retried} · 提示陪伴 ${counts.helped} · 看讲解学习 ${counts.studied} · 留待以后 ${counts.deferred}</p>${academyUI.mathPanel(s, "complete")}${academyUI.rewardHTML(s)}<div class="actions"><button id="goBuild" class="gold"><span class="button-icon" aria-hidden="true">▦</span>查看新搭档</button><button id="doneToday" class="primary">今天到这里</button>${s.stage < 2 ? `<button id="extra">自愿再玩 ${s.stage === 0 ? 3 : 2} 题</button>` : ""}</div><h3>今天想记住哪一步？（可跳过）</h3><div class="actions">${["符号", "通分", "变量与常数", "去括号", "最后一步计算", "填写答案", "暂时没有"].map((x) => `<button data-reflection="${x}" aria-pressed="${s.reflection === x}">${x}</button>`).join("")}</div><div class="actions"><button id="share">给爸爸的学习报告</button><button id="performance"><span class="button-icon" aria-hidden="true">✧</span>角色整活小剧场 · 可跳过</button></div><div id="showArea"></div></section>`;
  $("#goBuild").onclick = () => {
    view = "collection";
    render();
  };
  $("#doneToday").onclick = () => {
    notify(partnerLine(s.partnerId || state().academy.selected, "end"));
    view = "home";
    render();
  };
  if ($("#extra"))
    $("#extra").onclick = async () => {
      const date = learningDate();
      if (date !== s.date) {
        notify("这轮已经完成。新的广州学习日可以从首页开始，不需要补加练。");
        return;
      }
      await action((d) => {
        const next = begin(d, s.stage + 1);
        lockMathPartner(d, next);
      });
      await academyUI.mathEvent("greet");
    };
  document.querySelectorAll("[data-reflection]").forEach(
    (b) =>
      (b.onclick = () =>
        action((d) => {
          d.sessions[s.id].reflection = b.dataset.reflection;
        })),
  );
  $("#share").onclick = () => share(s);
  $("#performance").onclick = playShow;
}
function playShow() {
  $("#showArea").innerHTML =
    `<div class="comedy-stage"><h3>庆祝可以很隆重，彩纸先别喷到月球。</h3><div class="comedy-cast">${partnerArt(session()?.partnerId || state().academy.selected, "complete", 0)}${partnerArt(session()?.partnerId || state().academy.selected, "correct_big", 1)}${partnerArt(session()?.partnerId || state().academy.selected, "unlock_new_partner", 2)}</div><p>搭档的三步小庆祝：进场，撒星星，发现星星忘带了。没关系，掌声也可以很轻。</p></div><div class="actions"><button id="skipShow">跳过演出</button><button id="replayShow">再看一次</button></div>`;
  $("#skipShow").onclick = () => $("#showArea").replaceChildren();
  $("#replayShow").onclick = playShow;
}
function share(s) {
  reportPreview(makeReport(state(), s.date), s.date);
}
function reportPreview(report, date = "全部日期") {
  const stats = summarize(report);
  modal(
    `<h2>给爸爸的学习报告</h2><p>${E(date)} · ${stats.n} 题记录，独立首次答对 ${stats.independent} 题，正式答错 ${stats.errors} 次，求助 ${stats.helped} 题。</p><p>只包含日期、题型、完成方式和求助统计，不含草稿、基地或私人备注。文件不会自动发送；由你选择分享给谁。</p><details><summary>逐题预览</summary>${report.records.map((r) => `<p>${r.date} · ${E(subjects[r.subject])} · ${E(reportTypeName(r.template))} · ${modeNames[r.mode]} · 错误 ${r.errors} 次 · 提示 ${r.hint} 级</p>`).join("")}</details><div class="actions"><button id="sendReport" class="primary"><span class="button-icon" aria-hidden="true">↗</span>选择分享方式</button><button id="downloadReport"><span class="button-icon" aria-hidden="true">↓</span>下载报告文件</button></div><p id="reportStatus" role="status"></p>`,
  );
  const filename = `erin-learning-${date === "全部日期" ? "all" : date}.json`;
  $("#downloadReport").onclick = () => download(report, filename);
  $("#sendReport").onclick = async () => {
    const file = new File([JSON.stringify(report)], filename, {
      type: "application/json",
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "学习报告" });
        $("#reportStatus").textContent =
          "分享面板已关闭，请在接收设备确认文件。";
      } catch (e) {
        $("#reportStatus").textContent =
          e.name === "AbortError"
            ? "已取消分享，可以稍后再发。"
            : "分享未完成，请使用下载报告文件。";
      }
    } else {
      download(report, filename);
      $("#reportStatus").textContent =
        "已请求下载。请把文件发给爸爸，再在家长报告页导入。";
    }
  };
}
function renderParentReports(subjectFilter = "all") {
  let report;
  try {
    report = readReports();
  } catch {
    main.innerHTML =
      '<section class="card"><h1>家长报告暂时无法读取</h1><p>存储被禁用或原报告损坏，原数据未覆盖。请检查浏览器存储权限。</p></section>';
    return;
  }
  const a = summarize(report, subjectFilter);
  main.innerHTML = `<section class="card"><p class="eyebrow">LOCAL FAMILY REPORT</p><h1>家长报告 · 只在这台设备保存</h1><p>Erin 导出文件并发给你 → 在这里导入 → 累计查看趋势。没有自动同步。报告存储独立于学生练习，清除浏览器数据会丢失，请定期备份。</p><div class="actions"><label class="button">导入一份或多份报告<input id="importReport" type="file" accept=".json,application/json" multiple hidden></label><button id="exportReports"><span class="button-icon" aria-hidden="true">↓</span>备份累计报告</button><button id="studentReport">导出本机学生记录 · 先预览</button></div><p id="parentStatus" role="status"></p><div class="report-metrics"><p>练习天数 <strong>${a.days}</strong></p><p>记录样本 <strong>${a.n} 题</strong> · 完成 ${a.finished} 题（含学习与稍后再练）</p><p>独立首次答对 <strong>${a.finished ? Math.round((a.independent / a.finished) * 100) + "%" : "暂无"}</strong> · ${a.independent}/${a.finished} 题</p><p>正式答错 ${a.errors} 次 · 求助 ${a.helped} 题（求助不等于答错）</p></div><h2>三科分别看</h2>${a.subjects.map((x) => `<p>${x.name} · 样本 ${x.n} 题 · 已完成 ${x.finished} 题 · 独立首次答对 ${x.independent} 题 · 求助 ${x.helped} 题</p>`).join("")}<h2>每天的变化</h2><label>选择学科 <select id="reportSubject">${[["all", "全部"], ...Object.entries(subjects)].map(([id, name]) => `<option value="${id}" ${id === subjectFilter ? "selected" : ""}>${name}</option>`).join("")}</select></label><div class="table-scroll"><table><thead><tr><th>日期</th><th>样本 / 完成</th><th>独立首次答对</th><th>答错次数</th><th>求助题数</th></tr></thead><tbody>${a.dates.map((x) => `<tr><td>${x.date}</td><td>${x.n} / ${x.finished}</td><td>${x.independent}/${x.finished}</td><td>${x.errors}</td><td>${x.helped}</td></tr>`).join("")}</tbody></table></div><h2>哪些题型更需要陪练？</h2>${a.types.map((x) => `<p>${x.name} · 样本 ${x.n} 题 · 正式答错 ${x.errors} 次 · 求助 ${x.helped} 题 · 独立首次答对 ${x.independent}/${x.finished}</p>`).join("") || "<p>还没有报告。导入后会显示趋势。</p>"}<p class="caption">数据只描述已导入的样本，不推断长期能力。同一记录重复导入不重复计数，旧文件不会覆盖新记录。首次答对比例包含已走完的学习流程，不把看讲解当成答错。</p></section>`;
  $("#reportSubject").onchange = () =>
    renderParentReports($("#reportSubject").value);
  $("#exportReports").onclick = () =>
    download(report, "erin-parent-report-backup.json");
  $("#studentReport").onclick = () => reportPreview(makeReport(state()));
  $("#importReport").onchange = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    try {
      let combined = report;
      const { mergeReports } = await import("./reports.js");
      for (const f of files) {
        if (f.size > 8_000_000) throw Error("文件太大");
        combined = mergeReports(
          combined,
          validateReport(JSON.parse(await f.text())),
        );
      }
      importReport(combined);
      renderParentReports();
      $("#parentStatus").textContent =
        "已导入。重复记录已去重，学生进度未更改。";
    } catch (e) {
      $("#parentStatus").textContent =
        "未导入：" + e.message + "。原记录已保留。";
    }
  };
}
function renderWorld() {
  const d = state(),
    selected = catalog.find((x) => x.id === selectedItem);
  main.innerHTML = `<p class="eyebrow">YOUR WORLD / 随时能玩</p><div class="row"><div><h1>一格一格，搭成你的航站。</h1><p class="muted">选物件 → 点空格预览 → 确认放下。点已有物件可旋转、移动或收回。</p></div><button id="howToPlay"><span class="button-icon" aria-hidden="true">?</span>基地怎么玩？</button><button id="undoBuild">撤销上次摆放</button></div><div class="grid"><section class="card"><div class="board" aria-label="六行六列基地">${Array.from(
    { length: 36 },
    (_, cell) => {
      const item = d.layout.find((x) => x.cell === cell),
        c = item && catalog.find((x) => x.id === item.id);
      return `<button data-cell="${cell}" class="${selectedCell === cell ? "selected" : ""} ${previewCell === cell ? "preview" : ""}" aria-label="第 ${Math.floor(cell / 6) + 1} 行第 ${(cell % 6) + 1} 列 ${c ? c.name : "空地"}">${c ? `<span class="object" style="--item-color:${c.color};transform:rotate(${item.rotation * 90}deg)">${c.symbol}</span>` : "·"}</button>`;
    },
  ).join(
    "",
  )}</div><p class="caption board-caption">物件数量不会因收回而损失。当前外观：${skins.find((x) => x[0] === d.prefs.skin)[1]}。</p><div id="buildControls" class="actions">${previewCell !== null ? `<button id="confirmPlace" class="primary">${moving ? "移动到这里" : "放到这里"}</button><button id="cancelPlace">取消预览</button>` : selectedCell !== null ? '<button id="rotate">旋转</button><button id="move">移动到空格</button><button id="remove">收回库存</button>' : `<span class="caption">正在拿着：${selected.name}</span>`}</div><p id="buildFeedback" class="feedback" role="status"></p></section><section class="card"><h2>蓝图仓库</h2><p class="caption">已拥有物件可以反复摆弄，不需要刷题解锁操作。旧版蓝图作为收藏保留。新版学习奖励是搭档和星星。</p><div class="catalog">${catalog
    .map((c) => {
      const total = d.inventory[c.id] || 0,
        used = d.layout.filter((x) => x.id === c.id).length;
      return `<button data-item="${c.id}" ${total > used ? "" : "disabled"} aria-pressed="${selectedItem === c.id}"><span class="symbol">${c.symbol}</span>${c.name}<small>${total ? `可用 ${total - used} / 共 ${total}` : "等待蓝图"}</small></button>`;
    })
    .join(
      "",
    )}</div><h3>能量外观</h3><div class="actions">${skins.map(([id, name]) => `<button data-skin="${id}" aria-pressed="${d.prefs.skin === id}">${name}</button>`).join("")}</div><div class="companions">${buddy("gu", "蛋仔")}</div><button id="bounce">点一下，蛋仔弹跳</button></section></div>`;
  bindInstructions("world");
  document.querySelectorAll("[data-item]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedItem = b.dataset.item;
        selectedCell = null;
        previewCell = null;
        moving = false;
        renderWorld();
      }),
  );
  document.querySelectorAll("[data-cell]").forEach(
    (b) =>
      (b.onclick = () => {
        const cell = Number(b.dataset.cell),
          item = state().layout.find((x) => x.cell === cell);
        if (item) {
          selectedCell = cell;
          previewCell = null;
          moving = false;
        } else previewCell = cell;
        renderWorld();
      }),
  );
  if ($("#confirmPlace"))
    $("#confirmPlace").onclick = async () => {
      const dest = previewCell,
        source = selectedCell,
        expectedId = state().layout.find((x) => x.cell === source)?.id;
      const result = await action(
        (data) =>
          editWorld(
            data,
            moving
              ? { type: "move", cell: source, to: dest, expectedId }
              : { type: "place", cell: dest, id: selectedItem },
          ),
        false,
      );
      selectedCell = null;
      previewCell = null;
      moving = false;
      renderWorld();
      if (!result)
        $("#buildFeedback").textContent =
          "这个格子或库存刚发生变化，已保留最新布局，请再选一次。";
    };
  if ($("#cancelPlace"))
    $("#cancelPlace").onclick = () => {
      previewCell = null;
      moving = false;
      renderWorld();
    };
  if ($("#rotate"))
    $("#rotate").onclick = () =>
      action((data) => editWorld(data, { type: "rotate", cell: selectedCell }));
  if ($("#move"))
    $("#move").onclick = () => {
      moving = true;
      $("#buildFeedback").textContent = "现在点一个空格，预览移动位置。";
    };
  if ($("#remove"))
    $("#remove").onclick = async () => {
      await action(
        (data) => editWorld(data, { type: "remove", cell: selectedCell }),
        false,
      );
      selectedCell = null;
      renderWorld();
    };
  $("#undoBuild").onclick = () =>
    action((data) => editWorld(data, { type: "undo" }));
  document
    .querySelectorAll("[data-skin]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          action((data) => (data.prefs.skin = b.dataset.skin))),
    );
  $("#bounce").onclick = () => {
    const img = main.querySelector(".companion .character");
    img.classList.remove("bounce");
    void img.offsetWidth;
    img.classList.add("bounce");
  };
}
function renderStudio() {
  const c = state().clip;
  main.innerHTML = `<p class="eyebrow">THREE LITTLE SHOTS</p><h1>给伙伴剪一段三格短片。</h1><button id="howToPlay"><span class="button-icon" aria-hidden="true">?</span>短片怎么玩？</button><p class="muted">选镜头、换顺序、调转场。只是本机循环预览，不会导出或上传视频。</p><section class="card"><div class="shot-strip">${c.shots
    .map(
      (id, i) =>
        `<div class="shot-box"><p class="caption">镜头 ${i + 1}</p>${sprite(id)}<label>选伙伴<select data-shot="${i}">${characters
          .filter(([key]) => state().academy.unlocked.includes(key))
          .map(
            ([key, name]) =>
              `<option value="${key}" ${id === key ? "selected" : ""}>${name}</option>`,
          )
          .join(
            "",
          )}</select></label><button data-swap="${i}">与下一格换位</button></div>`,
    )
    .join(
      "",
    )}</div><div class="actions"><label>转场<select id="transition">${["淡入", "切换", "滑动"].map((x) => `<option ${c.transition === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><button id="playClip" class="primary">播放循环预览</button><button id="stopClip">停止</button></div><div id="clipPreview" class="shot-preview">${sprite(c.shots[0])}</div><p id="clipLabel" class="caption">镜头 1 / 3 · ${c.transition}</p></section>`;
  bindInstructions("studio");
  document
    .querySelectorAll("[data-shot]")
    .forEach(
      (b) =>
        (b.onchange = () =>
          action(
            (data) => (data.clip.shots[Number(b.dataset.shot)] = b.value),
          )),
    );
  document.querySelectorAll("[data-swap]").forEach(
    (b) =>
      (b.onclick = () =>
        action((data) => {
          const i = Number(b.dataset.swap),
            j = (i + 1) % 3;
          [data.clip.shots[i], data.clip.shots[j]] = [
            data.clip.shots[j],
            data.clip.shots[i],
          ];
        })),
  );
  $("#transition").onchange = () =>
    action((data) => (data.clip.transition = $("#transition").value));
  $("#playClip").onclick = () => {
    clearInterval(studioTimer);
    studioFrame = 0;
    const update = () => {
      const id = state().clip.shots[studioFrame % 3];
      $("#clipPreview").innerHTML = sprite(id);
      $("#clipPreview").classList.toggle(
        "sliding",
        state().clip.transition === "滑动",
      );
      $("#clipLabel").textContent =
        `镜头 ${(studioFrame % 3) + 1} / 3 · ${state().clip.transition}`;
      studioFrame++;
    };
    update();
    if (
      !state().prefs.reduced &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      studioTimer = setInterval(update, 2000);
    else $("#clipLabel").textContent = "减少动态效果已开启 · 静态镜头预览";
  };
  $("#stopClip").onclick = () => {
    clearInterval(studioTimer);
    studioTimer = null;
    $("#clipLabel").textContent = "已停止，随时可以再播放。";
  };
}
function download(data, name) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderSettings() {
  const d = state();
  main.innerHTML = `<p class="eyebrow">A QUIET CORNER</p><h1>按你舒服的方式来。</h1><div class="settings-grid"><section class="card"><h2>外观与动效</h2><p class="caption">主题只改变氛围，不改变题目难度。</p><div class="actions">${[
    ["block", "方块建造"],
    ["shadow", "暗影能量"],
    ["bounce", "欢乐弹跳"],
  ]
    .map(
      ([id, name]) =>
        `<button data-theme="${id}" aria-pressed="${d.prefs.theme === id}">${name}</button>`,
    )
    .join(
      "",
    )}</div><div class="actions"><button id="reduce" aria-pressed="${d.prefs.reduced}">减少动态效果：${d.prefs.reduced ? "开" : "关"}</button><button id="jokes" aria-pressed="${d.prefs.jokes}">轻量彩蛋：${d.prefs.jokes ? "开" : "关"}</button></div><p class="caption">声音默认关闭：本版没有音频资源。系统的减少动态效果设置也会被尊重。</p><h3>添加到 iPad 主屏幕</h3><p class="muted">用 Safari 打开最终正式地址，等“离线已就绪”，点分享 → 添加到主屏幕。第一次缓存需要联网。</p></section><section class="card"><h2>本机记录与备份</h2><p class="muted">无账号、不上传。清除浏览器数据、系统清理存储或更换域名可能丢记录；安装主屏幕不保证永久保存。</p><div class="actions"><button id="export"><span class="button-icon" aria-hidden="true">↓</span>导出学习备份</button><label class="button">导入备份<input id="import" type="file" accept=".json,application/json" hidden></label><button id="recovery">导出上次导入前备份</button></div><p class="caption">默认合并，保留当前基地布局；相同关卡题面冲突时保留本机版本。确认导入前会自动保留现有快照。</p><p id="importStatus" role="status"></p></section><section class="card"><h2>本机学习小记</h2><p class="caption">样本数只描述本机记录，不评定长期能力。求助与正式错误分开统计。</p><div id="localStats"></div><button id="showLegacy">查看旧版迁移说明</button></section><section class="card"><h2>版本与更新</h2><p class="muted">1.2.0 · 三科学习搭档。源码与自动部署由 GitHub 管理；练习和记录只在你的设备中运行与保存。</p><p class="caption">有新版本时会提示，当前关卡不会被自动刷新。跨域换站前先导出，再在新域名导入。</p></section></div>`;
  document
    .querySelectorAll("[data-theme]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          action((data) => (data.prefs.theme = b.dataset.theme))),
    );
  $("#reduce").onclick = () =>
    action((data) => (data.prefs.reduced = !data.prefs.reduced));
  $("#jokes").onclick = () =>
    action((data) => (data.prefs.jokes = !data.prefs.jokes));
  $("#export").onclick = () =>
    download(state(), `erin-backup-${learningDate()}.json`);
  $("#recovery").onclick = async () => {
    const previous = await db.recovery();
    if (previous) download(previous, "erin-before-import.json");
    else $("#importStatus").textContent = "还没有导入前快照。";
  };
  $("#import").onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      if (f.size > 8_000_000) throw Error("备份太大");
      const incoming = validate(JSON.parse(await f.text()));
      modal(
        `<h2>导入预览</h2><p>这份备份包含 ${Object.keys(incoming.sessions).length} 轮学习、${incoming.layout.length} 件基地摆放。</p><p class="caption">默认保守合并，保留本机布局与冲突关卡。替换会采用备份中的全部内容。两种方式都先自动保存当前快照。</p><div class="actions"><button id="mergeImport" class="primary">确认合并（推荐）</button><button id="replaceImport">确认替换</button></div>`,
      );
      for (const [id, replace] of [
        ["mergeImport", false],
        ["replaceImport", true],
      ])
        $("#" + id).onclick = async () => {
          try {
            await db.import(incoming, replace);
            $("#dialog").close();
            render();
            notify("已导入；导入前快照可在设置中导出。");
          } catch (e) {
            notify(e.message);
          }
        };
    } catch {
      notify("备份格式、大小或版本不支持，当前记录没有更改。");
    }
  };
  const stats = templateIds.map(() => ({ n: 0, errors: 0, helped: 0 }));
  for (const s of Object.values(d.sessions))
    s.questions.forEach((q, i) => {
      const r = s.records[i],
        a = stats[templateIds.indexOf(q.templateId)];
      if (r.mode || r.errors || r.maxHint) {
        a.n++;
        a.errors += r.errors;
        if (r.maxHint) a.helped++;
      }
    });
  $("#localStats").innerHTML =
    stats
      .map((a, i) =>
        a.n
          ? `<p class="caption">${names[i]} · 样本 ${a.n} 题 · 正式提交需重试 ${a.errors} 次 · 求助 ${a.helped} 题</p>`
          : "",
      )
      .join("") || '<p class="muted">还没有练习记录。今天先接上一小步。</p>';
  $("#showLegacy").onclick = () =>
    modal(
      '<h2>旧版与正式版</h2><p>旧版 v0.1 使用另一份本地记录。正式版不会清除它；请在旧版先导出原备份并保管。旧题结构不同，不会冒充成正式版的独立完成记录。</p><button id="exportOld">导出当前域名的旧版原始记录</button>',
    );
  $("#showLegacy").addEventListener("click", () => {
    $("#exportOld").onclick = () => {
      try {
        const raw = localStorage.getItem("erin-math-lab-v1");
        if (!raw) throw Error();
        download(
          { schema: "legacy-raw", original: raw },
          "erin-legacy-original.json",
        );
      } catch {
        notify("当前域名没有可读取的旧版记录。");
      }
    };
  });
}
render();
// Saved app state is exposed only as a module export for tests; no student data is sent anywhere.
export { db };
import { startPWA } from "./pwa.js";
startPWA(
  notify,
  () => {
    const s = session();
    return Boolean(
      (s && !s.completed) ||
        Object.values(state().academy.science.sessions).some(
          (x) => !x.completed,
        ),
    );
  },
  () => db.serial,
);
