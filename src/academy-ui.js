import {
  partners,
  partnerById,
  partnerArt,
  partnerLine,
  chooseEffect,
  eventStates,
  positiveEvent,
  states,
} from "./partners.js";
import {
  migrateAcademy,
  selectPartner,
  startScience,
  scienceTarget,
  submitScience,
  scienceHelp,
  advanceScience,
} from "./academy.js";
import { subjects, packs } from "./content/science.js";
import {
  scienceVisual,
  diagramParts,
  diagramQuestion,
  guideTarget,
} from "./science-visuals.js";
import { learningDate } from "./engine/scheduler.js";
import { mountEarthLab, selectEarthRegion } from "./earth-lab.js";
import { mountPlantLab } from "./plant-lab.js";
import { playPartnerSound } from "./partner-audio.js";
import { escape as E } from "./components/visual.js";
export function createAcademyUI({
  db,
  main,
  action,
  modal,
  notify,
  go,
  reportPreview,
}) {
  let subject = "biology",
    frame = 0,
    earthMode = "spin",
    effectTimer = null,
    welcomeTimer = null,
    effect = null;
  const a = () => db.state.academy;
  const math = () => db.state.sessions[db.state.active];
  const science = () => a().science.sessions[a().science.active[subject]];
  const currentId = () =>
    subject === "math"
      ? math()?.partnerId || a().selected
      : science()?.partnerId || a().selected;
  function panel(id, event = "thinking", knowledge = "", initialPose = null) {
    const fx =
      effect?.id === id && effect.event === event
        ? effect
        : {
            state: initialPose || eventStates[event] || "idle_default",
            variant: 0,
          };
    return `<div id="partnerStage" class="partner-stage ${effect?.id === id ? "reacting" : ""}" data-partner-id="${id}" data-state="${fx.state}" data-variant="${fx.variant}">${partnerArt(id, fx.state, fx.variant)}<div><strong>${partnerById(id).name} · 本轮搭档</strong><p role="status">${E(partnerLine(id, event, fx.variant, knowledge))}</p></div></div>`;
  }
  async function event(name, knowledge = "", id = currentId()) {
    let fx;
    await db.mutate((d) => {
      fx = chooseEffect(d, id, name);
    });
    effect = { ...fx, id, event: name };
    void playPartnerSound(id, fx.state, fx.variant);
    const old = main.querySelector("#partnerStage");
    if (old) old.outerHTML = panel(id, name, knowledge);
    clearTimeout(effectTimer);
    effectTimer = setTimeout(
      () => {
        main.querySelector("#partnerStage")?.classList.remove("reacting");
        effect = null;
      },
      ["complete", "unlock", "bonus"].includes(name) ? 2500 : 1300,
    );
  }
  function pickers() {
    return `<div class="partner-picker">${[...partners]
      .sort(
        (p, q) =>
          Number(a().unlocked.includes(q.id)) -
          Number(a().unlocked.includes(p.id)),
      )
      .map((p) =>
        a().unlocked.includes(p.id)
          ? `<button data-partner="${p.id}" aria-pressed="${a().selected === p.id}">${partnerArt(p.id, a().selected === p.id ? "greet" : "idle_default")}<strong>${p.name}</strong><small>${p.tagline}</small></button>`
          : `<button data-partner="${p.id}" disabled aria-label="未解锁的神秘搭档"><span class="partner-mystery" role="img" aria-label="神秘问号"><span>?</span></span><strong>神秘搭档</strong><small>完成探索后揭晓</small></button>`,
      )
      .join("")}</div>`;
  }
  function bindPickers() {
    main.querySelectorAll("[data-partner]").forEach(
      (b) =>
        (b.onclick = async () => {
          await action((d) => selectPartner(d, b.dataset.partner), false);
          home();
          await event("greet", "", b.dataset.partner);
        }),
    );
  }
  function home() {
    clearTimeout(welcomeTimer);
    effect = null;
    const d = db.state,
      s = math(),
      today = d.sessions[`${learningDate()}:0`],
      pending = s && !s.completed;
    main.innerHTML = `<section class="hero academy-hero"><div class="hero-copy"><p class="eyebrow">A LITTLE WONDER, ONE SUBJECT TODAY</p><h1>欢迎回来。<br>今天想探索什么？</h1><p class="muted">选一科就好，周末也能做。<br>没有补签，也不需要三科全做。</p><p>数学保持原来难度；生物、地理先看图，再慢慢认词。</p></div><div class="home-partner">${panel(a().selected, "greet", "", "idle_default")}<button id="bounceHome">看看搭档的欢迎动作</button></div></section><section class="subject-cards" aria-label="学科选择"><article class="card subject-math"><span class="subject-icon">±</span><h2>数学 · 数字训练营</h2><p>5题基础 + 自愿加练，约5～8分钟。第一、二章：有理数、整式加减。</p><button id="start" class="gold">${pending ? "继续数学 · " + (s.index + 1) + "/" + s.questions.length : today?.completed ? "看看数学收获" : "开始今天的数学 →"}</button></article>${[
      "biology",
      "geography",
    ]
      .map((sub) => {
        const b = a().science,
          old = b.sessions[b.active[sub]],
          done = b.nextDay[sub];
        return `<article class="card subject-${sub}"><span class="subject-icon">${sub === "biology" ? "❧" : "◎"}</span><h2>${subjects[sub]} · ${sub === "biology" ? "生命探索" : "地图观察局"}</h2><p>4题基础 + 2题自愿加练，约5～8分钟。已完成 ${Math.min(done, 7)}/7 次基础探索。</p><button id="${sub === "biology" ? "startBiology" : "startGeography"}" class="primary">${old && !old.completed ? "继续上次探索" : b.sessions[`${sub}:${learningDate()}:0`]?.completed ? "看看今天的收获" : done >= 7 ? "查看七天探索进度" : "开始第 " + (done + 1) + " 次探索 →"}</button></article>`;
      })
      .join(
        "",
      )}</section><section class="card"><div class="row"><div><p class="eyebrow">YOUR LEARNING PARTNER</p><h2>选一个搭档，陪你走完这一轮。</h2></div><button id="collectionLink">打开搭档图鉴</button></div><p>当前选择：${partnerById(a().selected).name}。每轮开始后搭档固定，切换对下一轮生效。看提示、看讲解也能获得完整奖励。</p>${pickers()}<p class="caption">已解锁 ${a().unlocked.length}/${partners.length} 位 · 收藏星星 ${a().stars}。完成基础或自愿加练，解锁下一位搭档；全部解锁后获得星星。</p></section><section class="card"><h2>学习小记</h2><button id="progressLink">三科学习进度</button></section>`;
    main.querySelector("#start").onclick = () => go("math");
    for (const sub of ["biology", "geography"])
      main.querySelector(
        sub === "biology" ? "#startBiology" : "#startGeography",
      ).onclick = async () => {
        subject = sub;
        try {
          await db.mutate((d) => startScience(d, sub));
          frame = 0;
          effect = null;
          go("science");
          await event("greet");
        } catch (e) {
          notify(e.message);
          go("progress");
        }
      };
    main.querySelector("#progressLink").onclick = () => go("progress");
    main.querySelector("#collectionLink").onclick = () => go("collection");
    main.querySelector("#bounceHome").onclick = async () => {
      clearTimeout(welcomeTimer);
      main
        .querySelector("#partnerStage")
        .scrollIntoView({ block: "center", behavior: "instant" });
      await event("greet", "", a().selected);
      const previewId = a().selected;
      welcomeTimer = setTimeout(() => {
        if (main.querySelector("#bounceHome") && a().selected === previewId) {
          effect = null;
          main.querySelector("#partnerStage").outerHTML = panel(
            previewId,
            "greet",
            "",
            "idle_default",
          );
        }
      }, 2500);
    };
    bindPickers();
  }
  function collection() {
    main.innerHTML = `<section class="card"><h1>学习搭档图鉴</h1><p>每位搭档有10种不同立绘姿势，按15类学习事件反馈；部分状态复用姿势，同一事件最近三次避免重复同一变化。轻微动效可以关闭。</p>${pickers()}<details><summary>看看当前搭档的15种反应</summary><div class="state-gallery">${states.map((state, i) => `<div>${partnerArt(a().selected, state)}<p>${["待机", "欢迎", "思考", "轻提示", "拆步骤", "答对", "漂亮完成", "温和纠错", "再试一次", "完成", "新搭档", "加练完成", "看解法", "三题连对", "五题连对"][i]}</p></div>`).join("")}</div></details><p>已收藏 ${a().unlocked.length}/${partners.length} 位 · 星星 ${a().stars}。旧版本可用的七个角色位置迁移为七位原创搭档；旧基地不减少。</p><button id="backHome">回到首页选择学科</button></section>`;
    main.querySelectorAll("[data-partner]").forEach(
      (b) =>
        (b.onclick = async () => {
          await action((d) => selectPartner(d, b.dataset.partner), false);
          collection();
        }),
    );
    main.querySelector("#backHome").onclick = () => go("home");
  }
  function progress() {
    const d = db.state,
      mathDates = Object.values(d.sessions)
        .filter((s) => !s.stage && s.completed)
        .map((s) => s.date);
    const scienceHistory =
      Object.values(a().science.sessions)
        .slice()
        .reverse()
        .map(
          (s) =>
            '<details class="science-history"><summary>' +
            s.date +
            " · " +
            subjects[s.subject] +
            " · 第" +
            (s.day + 1) +
            "次 · " +
            (s.stage ? "加练" : "基础") +
            "</summary>" +
            s.questions
              .map(
                (q, i) =>
                  "<article><h3>" +
                  E(q.prompt) +
                  "</h3><p>完成方式：" +
                  ({
                    independent: "独立首次答对",
                    helped: "提示后完成",
                    retried: "重试后完成",
                    studied: "看讲解学习",
                    deferred: "稍后再练",
                  }[s.records[i].mode] || "尚未完成") +
                  " · 求助 " +
                  s.records[i].maxHint +
                  " 级 · 正式答错 " +
                  s.records[i].errors +
                  " 次</p><details><summary>回看图解与讲解</summary>" +
                  scienceVisual(q)
                    .replace(
                      /<section class="earth-lab"[\s\S]*?<\/section>/,
                      "",
                    )
                    .replaceAll('id="earthReference"', "")
                    .replaceAll("<button ", "<button disabled ")
                    .replaceAll('tabindex="0"', 'tabindex="-1"') +
                  "<p>" +
                  E(q.solution) +
                  "</p><p>答案：" +
                  E(q.answer) +
                  "</p></details></article>",
              )
              .join("") +
            "</details>",
        )
        .join("") || "<p>还没有生物或地理记录。</p>";
    main.innerHTML = `<section class="card"><h1>按自己的节奏，走过七次探索。</h1><p>一天只选一科就可以。漏掉几天不扣进度，也不用补作业。</p><h2>数学</h2><p>已完成 ${new Set(mathDates).size} 个学习日；原有题目引擎与难度保留，每天更换数字和组合。</p>${["biology", "geography"].map((sub) => `<h2>${subjects[sub]}</h2><ol class="week-plan">${packs[sub].map((p, day) => `<li><strong>第${day + 1}次 · ${p[0]}</strong><span>${p[1]}</span><em>${Object.values(a().science.sessions).some((s) => s.subject === sub && s.day === day && !s.stage && s.completed) ? "已完成" : "待探索"}</em></li>`).join("")}</ol>`).join("")}<h2>生物与地理学习历史</h2><p>可回看每题的完成方式、图解和讲解；不会重复发奖励。</p>${scienceHistory}<h2>保留的数学历史</h2>${
      Object.values(d.sessions)
        .slice(-20)
        .reverse()
        .map(
          (s) =>
            `<p>${s.date} · ${["基础5题", "加练3题", "加练2题"][s.stage]} · ${s.index}/${s.questions.length} · ${s.completed ? "已完成" : "可继续"}</p>`,
        )
        .join("") || "<p>还没有数学记录。</p>"
    }</section>`;
  }
  function sciencePage() {
    const referenceOpen = main.querySelector("#earthReference")?.open;
    const s = science();
    if (!s) {
      go("home");
      return;
    }
    if (s.completed) {
      scienceSummary(s);
      return;
    }
    const q = diagramQuestion(s.questions[s.index]),
      r = s.records[s.index],
      token = { session: s.id, index: s.index },
      parts = diagramParts(q),
      targetPart = guideTarget(q),
      selected = r.visited.at(-1) || "";
    main.innerHTML = `<section class="card" data-science-index="${s.index}"><div class="row"><div><p class="eyebrow">${subjects[subject]} · 第${s.day + 1}次探索 · ${s.stage ? "自愿加练" : "基础探索"}</p><h1>${q.topic}</h1><p>${q.chapter} · ${s.index + 1}/${s.questions.length}</p></div><button id="scienceHome">暂时回航站</button></div>${panel(s.partnerId, r.resolved ? "correct" : "thinking")}<div class="science-layout"><section>${scienceVisual(q, selected, frame, earthMode)}</section><section><h2 class="question">${E(q.prompt)}</h2><div class="science-choices">${q.choices.map((c) => `<button data-science-choice="${E(c)}" aria-pressed="${r.input[0] === c}" ${r.resolved ? "disabled" : ""}>${E(c)}</button>`).join("")}</div><div class="actions"><button id="scienceSubmit" class="primary" ${r.resolved ? "hidden" : ""}>✓ 检查答案</button><button id="scienceNext" class="gold" ${r.resolved ? "" : "hidden"}>下一题 →</button></div><p id="scienceFeedback" class="feedback" role="status">${r.resolved ? (r.mode === "studied" ? "这题学完了。可以进入下一题。" : "答对了！点下一题继续。") : ""}</p><div class="actions learning-help"><button id="scienceHint1">✦ 一点思路</button><button id="scienceHint2">▤ 带我做第一步</button><button id="scienceExplain">♡ 我不会，直接看讲解</button><button id="scienceLater">↻ 稍后再练</button></div>${r.maxHint >= 1 ? `<section class="step"><h3>先看一个线索</h3><p>${E(partnerLine(s.partnerId, "hint_light", 0, q.hint))}</p></section>` : ""}${r.maxHint >= 2 ? `<section class="step"><h3>先完成一个小观察</h3><p>在图示中点击“${targetPart[1]}”，读一遍旁边的短解释。</p><p id="scienceStepFeedback">${r.guideIndex ? "这一步已经看懂了。" : ""}</p><button id="checkScienceStep">我已经找到这条线索</button><button id="demoScienceStep">先示范这一小步</button></section>` : ""}${r.maxHint >= 3 ? `<section class="step"><h3>完整讲解 · 一起弄懂</h3><p>${E(partnerLine(s.partnerId, "solution", 0))}</p><ol><li>先观察图示：${E(q.hint)}</li><li>${E(q.solution)}</li><li>所以这一题选择：<strong>${E(q.answer)}</strong>。</li></ol><p class="caption">看讲解不计作独立首次答对，也不扣奖励。</p><button id="scienceStudied">这题先学到这里</button></section>` : ""}</section></div></section>`;
    main.querySelector("#scienceHome").onclick = () => go("home");
    if (main.querySelector("#earthReference"))
      main.querySelector("#earthReference").open = Boolean(referenceOpen);
    mountEarthLab(main, q.id, async (region) => {
      await db.mutate((d) => {
        const t = scienceTarget(d, subject, token);
        if (t && !t.r.visited.includes(region)) t.r.visited.push(region);
      });
    });
    main.querySelectorAll("[data-region]").forEach(
      (b) =>
        (b.onclick = async () => {
          await db.mutate((d) => {
            const t = scienceTarget(d, subject, token);
            if (t && !t.r.visited.includes(b.dataset.region))
              t.r.visited.push(b.dataset.region);
            else if (t)
              t.r.visited = [
                ...t.r.visited.filter((v) => v !== b.dataset.region),
                b.dataset.region,
              ];
          });
          if (
            q.visual === "rotation" &&
            ["spin", "orbit"].includes(b.dataset.region)
          )
            earthMode = b.dataset.region;
          selectEarthRegion(q.id, b.dataset.region);
          if (
            b.dataset.region === "orbit" &&
            main.querySelector("#earthReference")
          )
            main.querySelector("#earthReference").open = true;
          if (
            q.visual === "rotation" &&
            ["day", "night"].includes(b.dataset.region)
          )
            earthMode = "spin";
          sciencePage();
        }),
    );
    main.querySelectorAll("svg [data-region]").forEach((b) => {
      b.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          b.onclick();
        }
      };
    });
    mountPlantLab(main, q.id, async (region) => {
      await db.mutate((d) => {
        const t = scienceTarget(d, subject, token);
        if (t && !t.r.visited.includes(region)) t.r.visited.push(region);
      });
    });
    if (main.querySelector("#earthMode"))
      main.querySelector("#earthMode").onclick = () => {
        earthMode = earthMode === "spin" ? "orbit" : "spin";
        frame = 0;
        sciencePage();
      };
    if (main.querySelector("#rotateEarth"))
      main.querySelector("#rotateEarth").onclick = () => {
        frame = (frame + 1) % 4;
        sciencePage();
      };
    main.querySelectorAll("[data-science-choice]").forEach(
      (b) =>
        (b.onclick = async () => {
          await db.mutate((d) => {
            const t = scienceTarget(d, subject, token);
            if (t && !t.r.resolved) t.r.input = [b.dataset.scienceChoice];
          });
          sciencePage();
        }),
    );
    main.querySelector("#scienceSubmit").onclick = async () => {
      const result = await action(
        (d) => submitScience(d, subject, token, r.input[0]),
        false,
      );
      if (result?.correct) {
        sciencePage();
        await event(
          positiveEvent(
            science().records,
            s.index,
            s.index === 0 && ["cells", "rotation"].includes(q.visual),
          ),
        );
      } else if (result?.valid) {
        main.querySelector("#scienceFeedback").textContent =
          "这次还没对上。看看图中的线索，或让搭档拆一步。";
        await event(science().records[s.index].errors > 1 ? "retry" : "wrong");
      } else if (!result?.stale)
        main.querySelector("#scienceFeedback").textContent =
          "先选一个答案，再检查。";
    };
    for (const [id, level, name] of [
      ["scienceHint1", 1, "hint_light"],
      ["scienceHint2", 2, "hint_step"],
      ["scienceExplain", 3, "solution"],
    ])
      main.querySelector("#" + id).onclick = async () => {
        await action((d) => scienceHelp(d, subject, token, level), false);
        sciencePage();
        await event(name, level < 3 ? q.hint : "");
      };
    const advance = async (defer = false) => {
      await action((d) => advanceScience(d, subject, token, defer), false);
      frame = 0;
      effect = null;
      sciencePage();
      if (science().completed)
        await event(
          science().partnerReward?.partner
            ? "unlock"
            : s.stage
              ? "bonus"
              : "complete",
        );
    };
    main.querySelector("#scienceNext").onclick = () => advance();
    main.querySelector("#scienceLater").onclick = () => advance(true);
    if (main.querySelector("#scienceStudied"))
      main.querySelector("#scienceStudied").onclick = async () => {
        await action((d) => {
          const t = scienceTarget(d, subject, token);
          if (t && !t.r.resolved) {
            t.r.resolved = true;
            t.r.mode = "studied";
          }
        }, false);
        sciencePage();
      };
    if (main.querySelector("#checkScienceStep"))
      main.querySelector("#checkScienceStep").onclick = async () => {
        if (!science().records[s.index].visited.includes(targetPart[0])) {
          main.querySelector("#scienceStepFeedback").textContent =
            "先点一下图示中的标签，再读一遍解释。";
          return;
        }
        await action((d) => {
          const t = scienceTarget(d, subject, token);
          if (t && !t.r.guideIndex) {
            t.r.guideIndex = 1;
            t.r.guideEvents.push({ mode: "independent" });
          }
        }, false);
        sciencePage();
      };
    if (main.querySelector("#demoScienceStep"))
      main.querySelector("#demoScienceStep").onclick = async () => {
        await action((d) => {
          const t = scienceTarget(d, subject, token);
          if (t && !t.r.guideIndex) {
            t.r.guideIndex = 1;
            t.r.guideEvents.push({ mode: "demonstrated" });
            if (!t.r.visited.includes(targetPart[0]))
              t.r.visited.push(targetPart[0]);
          }
        }, false);
        sciencePage();
      };
  }
  function rewardHTML(s) {
    const r = s.partnerReward;
    if (!r) return "<p>旧版收藏已保留，可到图鉴查看。</p>";
    return r.partner
      ? `<div class="partner-unlock">${partnerArt(r.partner, "unlock_new_partner")}<div><h3>新搭档：${partnerById(r.partner).name}</h3><p>${partnerById(r.partner).tagline}。返回首页后就能选择，下轮一起学。</p></div></div>`
      : `<p>搭档已全部解锁，收藏星星 +${r.stars} ✦。奖励已保存。</p>`;
  }
  function scienceSummary(s) {
    const counts = {};
    s.records.forEach((r) => (counts[r.mode] = (counts[r.mode] || 0) + 1));
    main.innerHTML = `<section class="card"><p class="eyebrow">${subjects[subject]} · 第${s.day + 1}次探索</p><h1>这一段探索完成了。</h1>${panel(s.partnerId, "complete")}<p>独立首次答对 ${counts.independent || 0} · 重试答对 ${counts.retried || 0} · 提示后答对 ${counts.helped || 0} · 看讲解学习 ${counts.studied || 0} · 稍后再练 ${counts.deferred || 0}。</p>${rewardHTML(s)}<div class="actions"><button id="scienceFinish" class="primary">今天到这里</button><button id="scienceCollection">看看搭档图鉴</button>${!s.stage ? '<button id="scienceBonus">自愿再探索 2 题</button>' : ""}<button id="scienceShare">给爸爸的学习报告</button></div><p>选择提示和讲解也有完整奖励。今天不用再做其他科。</p></section>`;
    main.querySelector("#scienceFinish").onclick = () => {
      notify(partnerLine(s.partnerId, "end"));
      go("home");
    };
    main.querySelector("#scienceCollection").onclick = () => go("collection");
    main.querySelector("#scienceShare").onclick = () => reportPreview(s.date);
    if (main.querySelector("#scienceBonus"))
      main.querySelector("#scienceBonus").onclick = async () => {
        try {
          await action((d) => startScience(d, subject, 1), false);
          sciencePage();
        } catch (e) {
          notify(e.message);
        }
      };
  }
  return {
    home,
    collection,
    progress,
    sciencePage,
    mathPanel: (s, eventName = "thinking") => {
      subject = "math";
      return panel(s?.partnerId || a().selected, eventName);
    },
    mathEvent: (name, knowledge = "") => {
      subject = "math";
      return event(name, knowledge, math()?.partnerId || a().selected);
    },
    rewardHTML,
    setSubject: (s) => (subject = s),
  };
}
