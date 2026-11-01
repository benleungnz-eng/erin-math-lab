import { rational as R, add, mul, div, show } from "./rational.js";
export const ENGINE_VERSION = 1;
export const templateIds = [
  "axis",
  "absolute",
  "compare",
  "sum",
  "product",
  "fraction",
  "square",
  "coefficient",
  "polynomial",
  "bracket",
  "substitute",
  "clip",
  "resources",
  "order",
];
export const names = [
  "数轴位置",
  "绝对值",
  "有理数大小",
  "正负数相加",
  "有理数乘除",
  "分数与正负号",
  "负号与平方",
  "隐含系数",
  "变量与常数",
  "去括号",
  "化简再代入",
  "剪辑时间轴",
  "基地资源",
  "运算顺序",
];
export const hash = (s) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
export function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
const sign = (n) => (n < 0 ? `− ${-n}` : `+ ${n}`);
const term = (n, v = "x") => (n === 1 ? v : n === -1 ? "−" + v : `${n}${v}`);
const choose = (prompt, choices, answer, feedback) => ({
  prompt,
  type: "choice",
  choices,
  expected: answer,
  feedback,
});
const input = (prompt, value, feedback) => ({
  prompt,
  type: "input",
  expected: show(typeof value === "number" ? R(value) : value),
  feedback,
});
export function generate(templateId, seed, kind = "base") {
  const t = templateIds.indexOf(templateId);
  if (t < 0) throw Error("未知题目版本");
  const random = rng(seed),
    int = (a, b) => a + Math.floor(random() * (b - a + 1));
  const a = int(2, 11),
    b = int(1, 8),
    c = int(1, 6),
    d = int(2, 5),
    k = int(-9, 9),
    n = int(-12, 12);
  let params,
    prompt,
    correctAnswer,
    labels = ["结果"],
    guidedSteps,
    visual = null,
    choices = null,
    difficulty = 1,
    context = "";
  switch (templateId) {
    case "axis":
      params = { n };
      prompt = `数轴上的机器人从 0 出发，到达 ${n}。它现在的位置是多少？`;
      correctAnswer = [R(n)];
      visual = { type: "axis", position: n };
      guidedSteps = [
        choose(
          `位置 ${n} 在 0 的哪边？`,
          ["左边", "原点", "右边"],
          n < 0 ? "左边" : n > 0 ? "右边" : "原点",
          `负数在左，正数在右，0 就在原点。`,
        ),
        {
          prompt: `点一下数轴上的 ${n}，让机器人停靠。`,
          type: "axis",
          expected: String(n),
          feedback: `停靠位置是 ${n}。位置带方向，不能把负号丢掉。`,
        },
      ];
      break;
    case "absolute":
      params = { n };
      prompt = `计算 |${n}|，也就是 ${n} 到 0 的距离。`;
      correctAnswer = [R(Math.abs(n))];
      visual = { type: "axis", position: n };
      guidedSteps = [
        choose(
          "距离可以是负数吗？",
          ["可以", "不可以"],
          "不可以",
          "距离只数相隔几个单位，不带方向。",
        ),
        input(
          `从 ${n} 到 0 要走几个单位？`,
          Math.abs(n),
          `|${n}| = ${Math.abs(n)}。负的位置也有非负的距离。`,
        ),
      ];
      break;
    case "compare":
      params = { a, b };
      prompt = `哪一个数更大：−${a} 与 −${a + b}？`;
      choices = [`−${a}`, `−${a + b}`];
      correctAnswer = [`−${a}`];
      visual = { type: "axis", position: -a };
      guidedSteps = [
        choose(
          "数轴上更大的数在什么方向？",
          ["左边", "右边"],
          "右边",
          "往右，数越来越大。",
        ),
        choose(
          `−${a} 和 −${a + b}，哪个更靠右？`,
          choices,
          choices[0],
          `−${a} 离 0 更近，也更靠右，所以更大。`,
        ),
      ];
      break;
    case "sum":
      params = { a, b };
      prompt = `计算：(−${a}) + ${b}`;
      correctAnswer = [R(-a + b)];
      visual = { type: "axis", position: -a };
      guidedSteps = [
        choose(
          `从 −${a} 加上正数 ${b}，该向哪边移动？`,
          ["左边", "右边"],
          "右边",
          "加上正数，沿数轴向右移动。",
        ),
        input(
          `从 −${a} 向右走 ${b} 格，最后的位置是？`,
          -a + b,
          `−${a} + ${b} = ${-a + b}。位置和移动方向一起决定结果。`,
        ),
      ];
      break;
    case "product":
      params = { a, b, c };
      prompt = `计算：(−${a}) × ${b} ÷ (−${c})`;
      correctAnswer = [R(a * b, c)];
      difficulty = 2;
      guidedSteps = [
        choose(
          "两个负号参与乘除，最终结果是什么符号？",
          ["正", "负"],
          "正",
          "负乘正先为负，再除以负数变成正。",
        ),
        input(`先算绝对值：${a} × ${b} = ?`, a * b, "先把乘法结果保留下来。"),
        input(
          `再除以 ${c}，可以保留精确分数。`,
          R(a * b, c),
          `最终是 ${show(correctAnswer[0])}，最后核对两个负号。`,
        ),
      ];
      break;
    case "fraction":
      params = { a, b, c: d };
      prompt = `计算：(−${a}/6 + ${b}/3) ÷ (−1/${d})`;
      correctAnswer = [R((a - 2 * b) * d, 6)];
      difficulty = 3;
      visual = { type: "fraction", denominator: 6, numerator: 2 * b };
      guidedSteps = [
        choose(
          "括号里两个分母不同，要先做什么？",
          ["分母直接相加", "通分成六分之一"],
          "通分成六分之一",
          "先把每一格变成同样大小，才能把分子相加。",
        ),
        input(
          `${b}/3 = ?/6，请只填分子。`,
          2 * b,
          `${b}/3 = ${2 * b}/6，分子分母同时乘 2，大小不变。`,
        ),
        input(
          `括号的分子：−${a} + ${2 * b} = ?`,
          -a + 2 * b,
          `括号内是 ${-a + 2 * b}/6 = ${show(R(-a + 2 * b, 6))}。`,
        ),
        input(
          `除以 −1/${d}，改成乘它的倒数。倒数是多少？`,
          -d,
          `除以非零分数，等于乘它的倒数：乘 (−${d})。`,
        ),
        input(
          `现在算 ${show(R(-a + 2 * b, 6))} × (−${d})。`,
          correctAnswer[0],
          `结果为 ${show(correctAnswer[0])}。先确定正负，再检查约分。`,
        ),
      ];
      break;
    case "square": {
      const bracket = int(0, 1);
      params = { a, b, bracket };
      prompt = `计算：${bracket ? `(−${a})²` : `−${a}²`} + ${b}`;
      correctAnswer = [R((bracket ? a * a : -a * a) + b)];
      difficulty = 2;
      guidedSteps = [
        choose(
          "平方的底数是什么？",
          [String(a), String(-a)],
          String(bracket ? -a : a),
          bracket
            ? "括号把负号圈进底数，所以整个负数乘自己。"
            : "没有括号，平方只管数字，外面的负号保留。",
        ),
        input(
          `平方运算并保留外侧负号后，加 ${b} 之前的值是多少？`,
          bracket ? a * a : -a * a,
          `${bracket ? `(−${a}) × (−${a})` : `−(${a} × ${a})`} = ${bracket ? a * a : -a * a}。`,
        ),
        input(
          `再加 ${b}。`,
          correctAnswer[0],
          `最后得到 ${show(correctAnswer[0])}。括号的位置改变了平方的底数。`,
        ),
      ];
      break;
    }
    case "coefficient": {
      const m = random() < 0.5 ? 1 : -1;
      params = { k, m };
      prompt = `合并：${term(k, "b")} ${m === 1 ? "+ b" : "− b"}`;
      correctAnswer = [R(k + m)];
      labels = ["b 的系数"];
      difficulty = 2;
      guidedSteps = [
        input(
          `单独的 ${m === 1 ? "b" : "−b"}，前面没写出来的系数是多少？`,
          m,
          `${m === 1 ? "b = +1b" : "−b = −1b"}，字母前的 1 没有消失。`,
        ),
        input(
          `带着符号相加：${k} + (${m}) = ?`,
          k + m,
          `系数合成 ${k + m}，b 保持不变。完整结果是 ${term(k + m, "b")}。`,
        ),
      ];
      visual = {
        type: "groups",
        cards: [
          { text: term(k, "b"), group: "变量项" },
          { text: m === 1 ? "＋b" : "−b", group: "变量项" },
        ],
      };
      break;
    }
    case "polynomial":
      params = { a, b, c };
      prompt = `化简：${a}x − ${b} + ${c}`;
      correctAnswer = [R(a), R(-b + c)];
      labels = ["x 的系数", "常数项"];
      difficulty = 2;
      visual = {
        type: "groups",
        cards: [
          { text: `${a}x`, group: "变量项" },
          { text: `−${b}`, group: "常数项" },
          { text: `＋${c}`, group: "常数项" },
        ],
      };
      guidedSteps = [
        {
          prompt: "把三张标签分别放进变量项区或常数区。",
          type: "groups",
          expected: "sorted",
          feedback: "带 x 的项与单独数字分开。常数不能塞进 x 的系数。",
        },
        input(`x 项只有 ${a}x，它的系数是多少？`, a, `x 的系数仍然是 ${a}。`),
        input(
          `常数放在一起：−${b} + ${c} = ?`,
          -b + c,
          `最后是 ${a}x ${sign(-b + c)}，变量项和常数项各回各位。`,
        ),
      ];
      break;
    case "bracket":
      params = { a, b, c, d };
      prompt = `化简：${a}x − (${b}x − ${c}) + ${d}`;
      correctAnswer = [R(a - b), R(c + d)];
      labels = ["x 的系数", "常数项"];
      difficulty = 3;
      guidedSteps = [
        choose(
          `括号前是减号，里面的 −${c} 去括号后变成？`,
          [`−${c}`, `＋${c}`],
          `＋${c}`,
          "减去负数变成加。括号里的每一项都要变号。",
        ),
        input(
          `去括号后 x 的系数：${a} − ${b} = ?`,
          a - b,
          `x 项变为 ${term(a - b)}。`,
        ),
        input(
          `常数是 +${c} 和 +${d}，合起来多少？`,
          c + d,
          `所以结果为 (${a - b})x + ${c + d}，两个栏分别填系数和常数。`,
        ),
      ];
      break;
    case "substitute":
      params = { a, b, c, d };
      prompt = `先化简，再求 ${a}x + ${b} − ${c}x 的值，x = −${d}。`;
      correctAnswer = [R((a - c) * -d + b)];
      difficulty = 3;
      guidedSteps = [
        input(
          `先合并 x 项，系数是 ${a} − ${c} = ?`,
          a - c,
          `化简成 (${a - c})x + ${b}，单独的 ${b} 不参与系数合并。`,
        ),
        input(
          `把 x 换成 (−${d})，先算 (${a - c}) × (−${d})。`,
          (a - c) * -d,
          "代入负数时加上括号，先做乘法。",
        ),
        input(
          `再加上原来的常数 ${b}。`,
          correctAnswer[0],
          `完整代入是 (${a - c}) × (−${d}) + ${b} = ${show(correctAnswer[0])}。最后核对填写结果。`,
        ),
      ];
      break;
    case "clip":
      params = { a, b, c };
      prompt = `混剪台有 ${a + b + c} 秒原片，剪掉 ${b} 秒，再拼接 ${c} 秒。成片多少秒？`;
      correctAnswer = [R(a + 2 * c)];
      visual = { type: "clip", total: a + b + c, cut: b, append: c };
      context = "给三格短片修一下时间轴。";
      guidedSteps = [
        choose(
          "剪掉一段，原片时长应怎样变化？",
          ["加上", "减去"],
          "减去",
          "剪去的片段从原片中拿走，对应减法。",
        ),
        input(
          `先算 ${a + b + c} − ${b}。`,
          a + c,
          `保留 ${a + c} 秒，剪掉的片段不再计入。`,
        ),
        input(
          `再接上 ${c} 秒。`,
          a + 2 * c,
          `${a + b + c} − ${b} + ${c} = ${a + 2 * c} 秒。`,
        ),
      ];
      break;
    case "resources":
      params = { a, b, c };
      prompt = `基地仓库原有 ${a} 块材料，收到 ${b} 包，每包 ${c} 块。现在共有多少块？`;
      correctAnswer = [R(a + b * c)];
      difficulty = 2;
      context = "建造前先整理仓库，不需要赶时间。";
      guidedSteps = [
        input(
          `先算新收到的 ${b} 包共有多少块：${b} × ${c}。`,
          b * c,
          `每包的量相同，用乘法得到 ${b * c} 块。`,
        ),
        input(
          `再与原来的 ${a} 块相加。`,
          a + b * c,
          `${a} + ${b} × ${c} = ${a + b * c}。先乘后加。`,
        ),
      ];
      break;
    case "order":
      params = { a, b, c };
      prompt = `算式 ${a} + ${b} × ${c}，第一步应该算哪一部分？`;
      choices = [`${a} + ${b}`, `${b} × ${c}`];
      correctAnswer = [choices[1]];
      guidedSteps = [
        choose(
          "没有括号时，加法和乘法谁先？",
          ["加法", "乘法"],
          "乘法",
          "先乘除后加减，不能只按从左到右。",
        ),
        choose(
          "点选实际先算的那一段。",
          choices,
          choices[1],
          `先算 ${b} × ${c} = ${b * c}，再加 ${a}。`,
        ),
      ];
      break;
  }
  const observations = {
    axis: choose(
      "先不数格子，负数在 0 的哪边？",
      ["左边", "右边"],
      "左边",
      "数轴向右越来越大；负数在 0 左边。",
    ),
    absolute: choose(
      "我们在找位置，还是到 0 的距离？",
      ["位置", "距离"],
      "距离",
      "绝对值数的是距离，所以不带负号。",
    ),
    compare: choose(
      "数轴上，越往哪边数越大？",
      ["左边", "右边"],
      "右边",
      "比较负数时也遵守向右越来越大的规则。",
    ),
    sum: choose(
      "加上一个正数，角色朝哪边走？",
      ["左边", "右边"],
      "右边",
      "从原来的位置向右移动；不要先丢掉起点的负号。",
    ),
    product: choose(
      "乘除运算中，两个负号一起出现，结果是什么符号？",
      ["正", "负"],
      "正",
      "同号相乘或相除得到正数，先判断符号再计算大小。",
    ),
    fraction: choose(
      "两个分数的格子大小不同，先做什么？",
      ["直接加分母", "先通分"],
      "先通分",
      "把格子变成相同大小后，才能把分子相加。",
    ),
    square: choose(
      "有括号的 (−a)²，负号是不是底数的一部分？",
      ["是", "不是"],
      "是",
      "括号把负号和数字圈成一个整体，平方是这个整体乘自己。",
    ),
    coefficient: choose(
      "单独的 b，前面省略的系数是多少？",
      ["＋1", "−1"],
      "＋1",
      "b 是 1 个 b；如果前面有减号，−b 才是 −1 个 b。",
    ),
    polynomial: choose(
      "带 x 的项，能和单独的常数直接合成 x 项吗？",
      ["能", "不能"],
      "不能",
      "先分组：带字母的项找同类，单独数字留在常数区。",
    ),
    bracket: choose(
      "括号前是减号，去括号要给哪些项变号？",
      ["只变第一项", "里面每一项"],
      "里面每一项",
      "减去一整个括号，等于里面每一项乘以 −1。",
    ),
    substitute: choose(
      "代入 x = −2 时，式子中哪部分要替换？",
      ["每一个 x", "所有数字"],
      "每一个 x",
      "只把变量换成给定的数，原来的系数与常数保留。",
    ),
    clip: choose(
      "剪掉一段片子，对原片时长做什么？",
      ["加上", "减去"],
      "减去",
      "把剪掉的时长从原片拿走，之后再计算拼接。",
    ),
    resources: choose(
      "每包一样多，计算多包总量时用什么？",
      ["乘法", "减法"],
      "乘法",
      "每包的数量 × 包数，得到新收到的总量。",
    ),
    order: choose(
      "没有括号时，加法和乘法谁先？",
      ["加法", "乘法"],
      "乘法",
      "先乘除，再加减；不能只从左到右。",
    ),
  };
  const observation = observations[templateId];
  const explanation = guidedSteps
    .filter((s) => s.type !== "groups" && s.type !== "axis")
    .map((s) => ({ math: s.prompt, detail: s.feedback }));
  explanation.push({
    math: `答案：${correctAnswer.map((x) => (typeof x === "string" ? x : show(x))).join("；")}`,
    detail:
      labels.length > 1
        ? "分别填写变量系数和常数，不把它们混在一起。"
        : "把结果与普通数学式子再对照一下。",
  });
  return {
    instanceId: `${templateId}-v1-${seed >>> 0}`,
    templateId,
    templateVersion: 1,
    skillIds: [templateId],
    difficulty,
    seed: seed >>> 0,
    params,
    correctAnswer,
    labels,
    choices,
    prompt,
    context,
    visual,
    observation,
    hintSteps: [observation.prompt, "每次完成一个小动作，不赶进度。"],
    guidedSteps,
    explanation,
    misconceptionTags: [templateId + "-step-check"],
    contentFingerprint: templateId + ":" + JSON.stringify(params),
    kind,
  };
}
