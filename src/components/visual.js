export const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function visual(q, record = {}) {
  const v = q.visual;
  if (!v) return "";
  if (v.type === "axis")
    return `<div class="caption">数轴：每个刻度相差 1；越往右越大</div><div class="axis" aria-label="从负十二到十二的数轴">${Array.from(
      { length: 25 },
      (_, i) => i - 12,
    )
      .map(
        (n) =>
          `<button data-axis="${n}" class="${n === v.position ? "current" : ""}" aria-label="数轴位置 ${n}">${n}</button>`,
      )
      .join(
        "",
      )}</div><p class="caption" id="axisMessage">当前位置 ${v.position} · 到 0 的距离 ${Math.abs(v.position)}</p>`;
  if (v.type === "fraction") {
    const ready = record.guideIndex >= 2;
    return `<p class="caption">一整条分为 6 格，每格 1/6；另一条分为 3 格，每格 1/3。先比较格子大小。</p><div class="fraction-blocks">${Array.from({ length: 6 }, () => "<i></i>").join("")}</div><div class="fraction-blocks" style="grid-template-columns:repeat(3,1fr)">${Array.from({ length: 3 }, () => "<i></i>").join("")}</div>${ready ? `<p class="caption">刚才已经接上：${q.params.b}/3 = ${v.numerator}/6，分子与分母同时乘 2。</p>` : ""}`;
  }
  if (v.type === "groups")
    return `<div class="term-cards">${v.cards.map((c) => `<button type="button" data-term="${escape(c.text)}">${escape(c.text)}</button>`).join("")}</div><p id="termMessage" class="caption">点标签看它属于哪一类；文字和符号与颜色一起区分。</p>`;
  if (v.type === "clip")
    return `<div class="clip-bars"><span style="flex:${v.total - v.cut}">保留 ${v.total - v.cut} 秒</span><span class="cut" style="flex:${v.cut}">剪去 ${v.cut} 秒</span><span class="append" style="flex:${v.append}">拼接 ${v.append} 秒</span></div><p class="caption">原片 ${v.total} 秒 = 保留部分 + 剪去部分；最后再加拼接段。</p>`;
  return "";
}
