import { escape as E } from "./components/visual.js";
export const partners = [
  ["ling", "棱夜", "shadow", "#73608d", "冷静，嘴硬但一直陪着你"],
  ["gu", "团团", "bounce", "#e9b951", "我们一起试试！"],
  ["lu", "格木", "block", "#599588", "一步一格，线索到位"],
  ["kirby", "云芽", "bounce", "#d897b1", "慢一点，脑袋也要软着陆"],
  ["mario", "齿轮", "block", "#c98258", "先把这一步装稳"],
  ["yoshi", "叶舟", "bounce", "#83a363", "一起找生命的小线索"],
  ["gen", "谜弦", "circus", "#8d78b4", "线索登场，答案稍后揭幕"],
  ["prism", "棱镜", "circus", "#5b9cb7", "换个角度看世界"],
  ["comet", "尾星", "shadow", "#657aa5", "别慌，轨道还在"],
  ["moss", "苔点", "block", "#78945f", "观察，标记，再前进"],
  ["bell", "铃幕", "circus", "#b27892", "欢迎来到小小发现秀"],
  ["pebble", "砾砾", "block", "#ac926c", "把陌生词拆成小块"],
].map(([id, name, kind, color, tagline]) => ({
  id,
  name,
  kind,
  color,
  tagline,
}));
export const states = [
  "idle_default",
  "greet",
  "thinking",
  "hint_light",
  "hint_step",
  "correct_small",
  "correct_big",
  "wrong_soft",
  "wrong_retry",
  "complete",
  "unlock_new_partner",
  "bonus_complete",
  "full_solution_react",
  "streak_3",
  "streak_5",
];
export const eventStates = {
  greet: "greet",
  thinking: "thinking",
  hint_light: "hint_light",
  hint_step: "hint_step",
  correct: "correct_small",
  excellent: "correct_big",
  wrong: "wrong_soft",
  retry: "wrong_retry",
  complete: "complete",
  unlock: "unlock_new_partner",
  bonus: "bonus_complete",
  solution: "full_solution_react",
  end: "idle_default",
  streak3: "streak_3",
  streak5: "streak_5",
};
export const partnerById = (id) =>
  partners.find((p) => p.id === id) || partners[0];
const phrases = {
  shadow: {
    greet: [
      "回来了？好，今天也一起拆招。",
      "哼，位置给你留着。",
      "不必补昨天，先看眼前。",
      "准备好了？我陪你。",
    ],
    thinking: [
      "先看线索，别被外表带跑。",
      "慢一点，破绽就在题里。",
      "先读条件，再动手。",
      "这题，我们拆开看。",
    ],
    wrong: [
      "还没对上。检查一条线索就好。",
      "先别急着否定自己。再看这里。",
      "这次没中，线索还在。",
      "重来一次，我没走。",
    ],
    retry: [
      "换个办法。我来陪你拆第一步。",
      "不硬扛，直接看示范也行。",
      "答案可以慢慢找，先抓一个条件。",
      "累了可以先学到这里。",
    ],
    correct: [
      "答对了。嗯，这步挺稳。",
      "对，就是这样。",
      "抓到线索了，不错。",
      "这一题，漂亮。",
    ],
    complete: [
      "收工。你认真走完了这一段。",
      "今天到这里也很好。",
      "提示算帮手，不是扣分项。",
      "下一次再来，我还在。",
    ],
  },
  bounce: {
    greet: [
      "欢迎回来！我们一起找个小发现吧～",
      "耶，又能一起探索啦！",
      "今天想学哪科？我们一起选！",
      "不补作业，我们从今天开始～",
    ],
    thinking: [
      "我们先看看图里藏了什么～",
      "先找一个小线索就好！",
      "不用急，我们一起读一遍。",
      "看到熟悉的地方了吗？",
    ],
    wrong: [
      "差一点点，我们一起再看看～",
      "这次没对上也没关系呀。",
      "来，我们先圈出一条线索！",
      "我陪你试另一种想法～",
    ],
    retry: [
      "我们把它拆成一小步吧。",
      "可以看完整讲解，我陪你读！",
      "先弄懂一个词，也是进步。",
      "不急，休息一下也可以～",
    ],
    correct: [
      "答对啦！我们找到啦～",
      "耶，这一步做对了！",
      "小线索立大功！",
      "对啦，给你一颗想象中的小星星！",
    ],
    complete: [
      "我们完成啦！提示也算认真学习哦～",
      "今天的小探索可以收工啦。",
      "新发现装进口袋，下次见！",
      "你愿意一步步试，我就很开心！",
    ],
  },
  circus: {
    greet: [
      "欢迎来到今天的发现小剧场！",
      "观众只有我们，演出随时可停。",
      "幕布升起！今天先选一科。",
      "不补演昨天，今天重新开场！",
    ],
    thinking: [
      "请看！线索选手正在题里待命。",
      "第一幕：先观察，答案稍后揭晓。",
      "聚光灯给这一条条件！",
      "悬念先留着，我们看看图。",
    ],
    wrong: [
      "剧情出现小转弯！线索还在。",
      "答案暂未登台，先换个角度。",
      "不必谢幕，再找一个小细节。",
      "这不是失败，是线索还没集合。",
    ],
    retry: [
      "导演决定：拆成一个小步骤！",
      "可以请完整讲解上台帮忙。",
      "先弄懂一个词，剧情就前进啦。",
      "幕间休息也完全可以。",
    ],
    correct: [
      "答对！线索选手成功会合！",
      "漂亮！这一幕接上了。",
      "答案登台，掌声轻轻来！",
      "对啦！彩纸预算先省着。",
    ],
    complete: [
      "本轮谢幕！你认真参与就是主角。",
      "今天演出到这里，随时欢迎回来。",
      "提示演员也有功劳，不扣奖励。",
      "收工！下回继续小小发现。",
    ],
  },
  block: {
    greet: [
      "进度已就位。选择今天的一科。",
      "欢迎回来。从当前一步开始。",
      "不补签。今天正常开始。",
      "搭档上线。先看一题。",
    ],
    thinking: [
      "观察目标。标出条件。",
      "先看图，再读词。",
      "一次处理一个线索。",
      "已知条件优先。",
    ],
    wrong: [
      "尚未匹配。重看一条条件。",
      "保留想法。检查关键位置。",
      "再试一次。也可查看提示。",
      "先核对图与词的对应。",
    ],
    retry: [
      "切换分步模式。只做第一步。",
      "完整讲解可用。不扣奖励。",
      "先识别一个术语。",
      "可暂停。进度会保存。",
    ],
    correct: [
      "匹配成功。答对了。",
      "这一格完成。",
      "条件吻合。继续由你决定。",
      "答案正确。进度已保存。",
    ],
    complete: [
      "本轮完成。奖励已记录。",
      "今天可结束。",
      "提示不影响奖励。",
      "下次从新的一步开始。",
    ],
  },
};
export function chooseEffect(data, partnerId, event) {
  const a = data.academy;
  if (!a) return { state: eventStates[event] || "idle_default", variant: 0 };
  const key = partnerId + ":" + event,
    history = a.effects[key] || [],
    available = [0, 1, 2, 3].filter((i) => !history.includes(i));
  const values = new Uint32Array(1);
  globalThis.crypto?.getRandomValues(values);
  const variant =
    available[(values[0] || Object.keys(a.effects).length) % available.length];
  a.effects[key] = [...history, variant].slice(-3);
  return { state: eventStates[event] || "idle_default", variant };
}
export function partnerLine(id, event, variant = 0, knowledge = "") {
  const p = partnerById(id),
    pool = phrases[p.kind];
  const key = ["hint_light", "hint_step", "solution"].includes(event)
    ? "thinking"
    : ["excellent", "streak3", "streak5"].includes(event)
      ? "correct"
      : ["unlock", "bonus"].includes(event)
        ? "complete"
        : event;
  let line = (pool[key] || pool.thinking)[variant % 4];
  const special = {
    solution: {
      shadow: "不硬猜。我把完整步骤摆出来，一步一步看。",
      bounce: "我们一起读完整讲解！先看懂一小段就好～",
      circus: "请完整讲解登场！把每条线索接成一出小戏。",
      block: "完整解法已就位。按步骤核对。",
    },
    unlock: {
      shadow: "新搭档到了。哼，队伍又强了一点。",
      bounce: "新朋友来啦！下轮也可以选它一起学～",
      circus: "新嘉宾登台！图鉴又多了一位演员。",
      block: "新搭档已解锁。首页可选择。",
    },
    bonus: {
      shadow: "加练也完成了，今天可以好好收工。",
      bounce: "额外的小探索也完成啦！我们休息一下～",
      circus: "加演成功谢幕！不必再加一场。",
      block: "附加阶段完成。可结束。",
    },
    end: {
      shadow: "今天到这里。下次回来，我还在。",
      bounce: "今天辛苦啦！下次我们再一起探索～",
      circus: "小剧场收工！下次回来继续当主角。",
      block: "本次结束。进度已保存，随时回来。",
    },
  };
  if (special[event])
    line =
      special[event][p.kind] +
      ["", " 慢慢来。", " 由你决定下一步。", " 不用赶时间。"][variant % 4];
  if (knowledge) {
    const prefix = {
      shadow: "看清这个规则：",
      bounce: "来，我们一起看：",
      circus: "请规则选手登场：",
      block: "线索：",
    }[p.kind];
    line = `${prefix}${knowledge}${{ shadow: " 不必硬猜，先把这一条抓稳。", bounce: " 我们先找这一条小线索，再一起往下看～", circus: " 聚光灯给这条线索，答案选手稍后登场！", block: " 先定位，再判断。" }[p.kind]}`;
  }
  return `${p.name}：${line}`;
}
// All original vector art. State names change facial expression, props, pose and semantic caption.
export function partnerArt(id, state = "idle_default", variant = 0) {
  const p = partnerById(id),
    n = states.indexOf(state),
    happy = /correct|complete|streak|unlock/.test(state),
    soft = /wrong/.test(state),
    hint = /hint|solution/.test(state);
  const mouth = happy
    ? "M78 111 Q95 133 113 109"
    : soft
      ? "M83 116 Q95 110 108 116"
      : "M84 116 Q95 123 106 116";
  const body =
    p.kind === "block"
      ? '<rect x="48" y="56" width="92" height="93" rx="12"/>'
      : p.kind === "shadow"
        ? '<path d="M95 30 116 52 145 52 136 82 150 108 126 142 96 157 63 144 40 112 52 82 46 55 75 51Z"/>'
        : p.kind === "circus"
          ? '<path d="M48 74 61 26 96 54 132 30 143 78 132 140 96 158 56 140Z"/>'
          : '<path d="M49 80 Q45 41 87 45 Q123 27 138 72 Q165 114 130 146 Q96 169 59 143 Q30 121 49 80Z"/>';
  const marks = [
    "·",
    "✦",
    "?",
    "⌕",
    "①",
    "✓",
    "✧",
    "…",
    "↻",
    "★",
    "＋",
    "✩",
    "▤",
    "③",
    "⑤",
  ];
  const labels = [
    "安静待机",
    "欢迎回来",
    "一起思考",
    "找一条线索",
    "拆成小步骤",
    "答对了",
    "做得漂亮",
    "换个角度",
    "继续陪你试",
    "完成本轮",
    "解锁新搭档",
    "加练完成",
    "读完整讲解",
    "三题连对",
    "五题连对",
  ];
  const eyes = happy
    ? '<path d="M64 100q9-13 18 0m26 0q9-13 18 0"/>'
    : soft
      ? '<path d="M67 92l12 3m31 0 12-3M72 100v6m45-6v6"/>'
      : state === "thinking"
        ? '<path d="M68 92h12m31 0h12M74 100v6m44-6v6"/>'
        : '<path d="M71 89v13m47-13v13"/>';
  const props =
    {
      greet:
        '<path d="M42 111 29 66m-9 7 8-7 9 6" stroke="#466b77" stroke-width="8" fill="none" stroke-linecap="round"/>',
      thinking:
        '<circle cx="144" cy="65" r="5" fill="#e7dfc7"/><path d="M129 129 106 121" stroke="#466b77" stroke-width="8"/>',
      hint_light:
        '<circle cx="153" cy="38" r="17" fill="#f6db7b"/><path d="M145 57h16m-12 5h8M153 10V4m23 16 6-4m-52 3-6-4" stroke="#b48b38" stroke-width="3"/>',
      hint_step:
        '<g fill="#fff6dc" stroke="#778f9c" stroke-width="2"><rect x="122" y="115" width="47" height="38" rx="5"/><path d="M132 126h25m-25 9h18m-18 9h24"/></g>',
      correct_small:
        '<path d="M145 96v-17q-2-10 7-10l3 10h12v24h-22" fill="#fff3da" stroke="#466b77" stroke-width="3"/>',
      correct_big:
        '<path d="m20 44 4-11 5 11 12 3-12 5-5 12-4-12-11-5Zm129 103 4-11 5 11 12 3-12 5-5 12-4-12-11-5Z" fill="#e5b84e"/>',
      wrong_soft:
        '<ellipse cx="61" cy="113" rx="10" ry="4" fill="#dcb2a5"/><ellipse cx="130" cy="113" rx="10" ry="4" fill="#dcb2a5"/>',
      wrong_retry:
        '<path d="M18 140a22 22 0 0 0 34 15m-2 0-9-1m9 1-2-9" stroke="#8ba6a0" stroke-width="4" fill="none"/>',
      complete:
        '<path d="M78 143h34v20H78zm7 20v9h20v-9M77 147H65q0 18 18 14m30-14h12q0 18-18 14" fill="#e4c064" stroke="#937a41" stroke-width="3"/>',
      unlock_new_partner:
        '<g fill="#bf9ac9" stroke="#705484" stroke-width="2"><rect x="67" y="138" width="58" height="35" rx="5"/><path d="M67 147h58m-29-9v35"/><path d="M95 138q-30-23-25-4l25 4q30-23 25-4Z" fill="none"/></g>',
      bonus_complete:
        '<circle cx="143" cy="143" r="19" fill="#e9cb71" stroke="#9f8033" stroke-width="3"/><path d="m143 130 4 8 9 1-7 7 2 9-8-5-8 5 2-9-7-7 9-1Z" fill="#fff6cf"/>',
      full_solution_react:
        '<path d="M57 137q20-7 39 1 20-8 39-1v34q-19-7-39 0-19-7-39 0Zm39 1v33" fill="#f5e9cb" stroke="#788f9c" stroke-width="3"/>',
      streak_3:
        '<text x="95" y="27" text-anchor="middle" fill="#c89c3c" font-size="22">✦ ✦ ✦</text>',
      streak_5:
        '<text x="95" y="27" text-anchor="middle" fill="#b78a30" font-size="18">✦ ✦ ✦ ✦ ✦</text>',
    }[state] || "";
  const identity = partners.findIndex((x) => x.id === id) % 4;
  const emblem =
    identity === 0
      ? '<path d="m95 55 9 10-9 10-9-10Z" fill="#fff3cc"/>'
      : identity === 1
        ? '<circle cx="95" cy="65" r="8" fill="#fff4cf"/>'
        : identity === 2
          ? '<path d="M86 59h18v13H86Z" fill="#fff3cc"/>'
          : '<path d="M85 69q10-24 20 0" fill="#fff3cc"/>';
  return `<span class="partner-art state-${E(state)} variant-${variant}" role="img" aria-label="${p.name} · ${labels[Math.max(n, 0)]}"><svg viewBox="0 0 190 195" aria-hidden="true"><ellipse cx="95" cy="179" rx="48" ry="7" fill="#26343818"/><g fill="${p.color}" stroke="#283740" stroke-width="3" stroke-linejoin="round">${body}<path d="M64 151 56 171 79 171M118 151 128 171 107 171"/><path class="partner-hand" d="M138 102 164 ${hint ? 65 : happy ? 54 : soft ? 120 : state === "greet" ? 62 : 108}" fill="none" stroke-width="10" stroke-linecap="round"/></g><g stroke="#263438" stroke-width="5" stroke-linecap="round" fill="none">${eyes}<path d="${mouth}" stroke-width="3"/></g>${p.kind === "shadow" ? '<path d="m65 80 15 5m30 0 15-5" stroke="#263438" stroke-width="3"/>' : ""}${emblem}<g class="state-prop"><circle cx="156" cy="41" r="22" fill="#fff8df" stroke="${p.color}" stroke-width="3"/><text x="156" y="49" text-anchor="middle" font-size="25" fill="#263438">${marks[Math.max(n, 0)]}</text></g>${props}</svg></span>`;
}
