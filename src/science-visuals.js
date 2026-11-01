import { escape as E } from "./components/visual.js";
const cells = [
  ["wall", "细胞壁", "植物细胞膜外较厚的一层，起支持和保护作用。"],
  ["membrane", "细胞膜", "控制物质进出的薄边界，植物和动物细胞都有。"],
  ["nucleus", "细胞核", "含有重要的遗传信息，植物和动物细胞都有。"],
  [
    "chloroplast",
    "叶绿体",
    "光合作用的主要场所；常见于绿色部位的细胞，不是所有植物细胞都有。",
  ],
  ["vacuole", "液泡", "内部有细胞液，成熟植物细胞常有较大的中央液泡。"],
];
export const sceneParts = {
  living: [
    ["plant", "豆苗", "能生长、呼吸等，属于生物。"],
    ["snail", "蜗牛", "摄取食物、呼吸、生长，属于生物。"],
    ["rock", "石头", "没有生命活动，不属于生物。"],
    ["car", "汽车", "耗燃料和移动不等于有生命，不属于生物。"],
  ],
  field: [
    ["plant", "校园植物", "观察形态、数量和生长环境，记录可核对的事实。"],
    ["snail", "潮湿角落", "蜗牛常在阴暗潮湿处活动，观察时不破坏栖息环境。"],
    ["record", "观察记录", "写下地点、日期和观察结果；区分事实与推测。"],
  ],
  microscope: [
    ["eyepiece", "目镜", "靠近眼睛一端，用来观察。"],
    ["objective", "物镜", "靠近标本一端，与目镜共同放大。"],
    ["stage", "载物台", "承载标本，让光通过标本进入物镜。"],
    ["light", "光路", "普通光学显微镜观察时，光要经过薄而透明的标本。"],
  ],
  cells,
  structures: cells,
  levels: [
    ["cell", "细胞", "生物体结构和功能的基本单位。"],
    ["tissue", "组织", "形态相似、结构和功能相近的细胞构成。"],
    ["organ", "器官", "多种组织构成，具有一定的功能，例如胃、叶。"],
    [
      "system",
      "动物的系统",
      "多个器官协作，例如消化系统；植物通常不分出这一级。",
    ],
    [
      "body",
      "生物体",
      "人体：细胞→组织→器官→系统→人体；植物：细胞→组织→器官→植物体。",
    ],
  ],
  division: [
    [
      "division",
      "细胞分裂",
      "一个细胞分成两个，细胞数量增加；多细胞生物的个体数不因此增加。",
    ],
    ...cells,
  ],
  globe: [
    ["equator", "赤道", "0°纬线，是南北半球的分界线。"],
    ["longitude", "经线", "连接南北两极，指示南北方向。"],
    ["latitude", "纬线", "与赤道平行，指示东西方向。"],
  ],
  rotation: [
    ["day", "亮面：白昼", "面对太阳、得到照亮的一侧。"],
    ["night", "暗面：黑夜", "背向太阳、没有被照亮的一侧。"],
    ["spin", "自转", "绕地轴转动，约一天一周，自西向东。"],
    [
      "orbit",
      "公转",
      "地球绕太阳运行，约一年一周；公转且地轴倾斜，与四季变化有关。",
    ],
  ],
  map: [
    ["north", "方向", "本图指北箭头向上，因此上北下南、左西右东。"],
    [
      "legend",
      "图例",
      "蓝色弯线代表河流，红色道路代表公路，方框内的校字代表学校。",
    ],
    ["scale", "比例尺", "本图1:10000，图上1厘米对应实地100米。"],
  ],
  contours: [
    ["dense", "密线：较陡", "相同等高距下，等高线较密表示坡度较陡。"],
    ["sparse", "疏线：较缓", "相同等高距下，等高线较疏表示坡度较缓。"],
    ["height", "等高线", "同一条等高线上，各点海拔相同；本图等高距为100米。"],
  ],
  oceans: [
    ["ocean", "海洋约71%", "海洋面积较大，各大洋彼此连通。"],
    ["land", "陆地约29%", "大陆与岛屿都是陆地；大陆和附近岛屿合称大洲。"],
    ["island", "岛屿与半岛", "岛屿四面环水；半岛一面与大陆相连、三面临海。"],
  ],
  continents: [
    ["asia", "亚洲", "面积最大的大洲，主要在东半球和北半球。"],
    ["africa", "非洲", "赤道经过非洲，因此跨南北半球。"],
    ["antarctica", "南极洲", "南极附近的大洲，以陆地为主体。"],
    ["pacific", "太平洋", "面积最大的大洋，跨越地图左右边界所示区域。"],
    ["arctic", "北冰洋", "环绕北极地区的大洋。"],
  ],
  changes: [
    ["plates", "板块", "地表岩石圈分成板块，板块交界地带通常较活跃。"],
    [
      "evidence",
      "海陆变化证据",
      "海底古河道、山地海洋生物化石等可为海陆变迁提供证据。",
    ],
    ["drift", "大陆漂移", "大陆过去可能相连，之后逐渐分离，要结合多方面证据。"],
  ],
};
export function diagramParts(q) {
  return sceneParts[q.visual] || cells;
}
function cellDiagram() {
  return `<text x="155" y="24" text-anchor="middle">叶肉细胞（示意）</text><text x="470" y="24" text-anchor="middle">动物细胞（示意）</text><rect x="25" y="45" width="265" height="225" rx="28" fill="#dbe8b8" stroke="#648946" stroke-width="9"/><rect x="36" y="56" width="243" height="203" rx="22" fill="#f9f6cf" stroke="#b07b52" stroke-width="3"/><rect x="111" y="83" width="139" height="147" rx="35" fill="#cce7f1" stroke="#70a6bc" stroke-width="2"/><circle cx="77" cy="174" r="25" fill="#b4a0cc" stroke="#715383" stroke-width="3"/>${[70, 122, 185, 243].map((x, i) => `<ellipse cx="${x}" cy="${i % 2 ? 70 : 244}" rx="18" ry="8" fill="#719e4f"/>`).join("")}<ellipse cx="470" cy="151" rx="132" ry="103" fill="#f7e4ce" stroke="#b07b52" stroke-width="4"/><circle cx="479" cy="149" r="31" fill="#b4a0cc" stroke="#715383" stroke-width="3"/><text x="77" y="180" text-anchor="middle">③</text><text x="479" y="155" text-anchor="middle">③</text><text x="180" y="159" text-anchor="middle">⑤</text><text x="20" y="145">①</text><text x="42" y="110">②</text><text x="580" y="155">②</text><text x="120" y="70">④</text>`;
}
function world() {
  return `<rect x="12" y="12" width="616" height="274" rx="20" fill="#d8edf1"/><path d="M20 153H620" stroke="#a86152" stroke-dasharray="6 5"/><text x="20" y="148">赤道</text>${[
    [85, 65, "北美洲"],
    [150, 200, "南美洲"],
    [305, 65, "欧洲"],
    [455, 65, "亚洲"],
    [310, 170, "非洲"],
    [515, 218, "大洋洲"],
    [320, 264, "南极洲"],
  ]
    .map(
      ([x, y, t]) =>
        `<rect x="${x - 43}" y="${y - 21}" width="86" height="40" rx="12" fill="#c2d3a4" stroke="#6b8959"/><text x="${x}" y="${y + 5}" text-anchor="middle">${t}</text>`,
    )
    .join(
      "",
    )}<text x="310" y="33">北冰洋</text><text x="210" y="120">大西洋</text><text x="405" y="190">印度洋</text><text x="20" y="220">太平洋</text><text x="548" y="135">太平洋</text>`;
}
export function scienceVisual(q, selected = "", frame = 0, earthMode = "spin") {
  let body = "",
    caption = "教学简图，形状、大小和距离不按真实比例。";
  const v = q.visual;
  if (["cells", "structures", "division"].includes(v)) {
    body = cellDiagram();
    caption =
      "细胞结构示意，不是显微照片；①壁 ②膜 ③核 ④叶绿体 ⑤液泡。叶肉细胞为植物细胞的一个例子。";
    if (v === "division")
      body =
        '<text x="320" y="292" text-anchor="middle">细胞分裂：一个 → 两个（细胞数量增加）</text>' +
        body;
  } else if (v === "levels")
    body = `<text x="15" y="50">动物体：</text><text x="15" y="175">绿色开花植物：</text>${["细胞", "组织", "器官", "系统", "动物体"].map((t, i) => `<rect x="${20 + i * 124}" y="65" width="105" height="58" rx="12" fill="#e5ddf1"/><text x="${72 + i * 124}" y="101" text-anchor="middle">${t}</text>${i < 4 ? `<text x="${127 + i * 124}" y="100">→</text>` : ""}`).join("")}${["细胞", "组织", "器官", "植物体"].map((t, i) => `<rect x="${20 + i * 155}" y="192" width="126" height="58" rx="12" fill="#e2edcf"/><text x="${83 + i * 155}" y="228" text-anchor="middle">${t}</text>${i < 3 ? `<text x="${148 + i * 155}" y="228">→</text>` : ""}`).join("")}`;
  else if (v === "microscope")
    body =
      '<path d="M300 45 345 60 310 142 275 128Z" fill="#a9bac2" stroke="#425d69" stroke-width="4"/><path d="M320 95 Q420 125 385 230L275 230" fill="none" stroke="#698693" stroke-width="24"/><path d="M246 164H359M310 170V220M260 256H425" stroke="#415e66" stroke-width="12" stroke-linecap="round"/><path d="M296 211V179" stroke="#e1bc47" stroke-width="5"/><text x="355" y="49">目镜</text><text x="193" y="130">物镜</text><text x="380" y="169">载物台</text><text x="164" y="225">光经过标本 ↑</text>';
  else if (["living", "field"].includes(v))
    body = `${[
      ["植物", "🌱", 95],
      ["蜗牛", "🐌", 245],
      ["石头", "◒", 395],
      ["汽车", "▰", 545],
    ]
      .map(
        ([t, icon, x]) =>
          `<rect x="${x - 65}" y="65" width="130" height="150" rx="16" fill="#e7efd9"/><text x="${x}" y="140" text-anchor="middle" font-size="48">${icon}</text><text x="${x}" y="190" text-anchor="middle">${t}</text>`,
      )
      .join(
        "",
      )}<text x="320" y="260" text-anchor="middle">观察：生长、营养、呼吸、繁殖、对刺激作出反应……</text>`;
  else if (v === "globe")
    body =
      '<circle cx="320" cy="150" r="114" fill="#d3e8ee" stroke="#527f8b" stroke-width="3"/><ellipse cx="320" cy="150" rx="54" ry="114" fill="none" stroke="#7ba0ac"/><ellipse cx="320" cy="150" rx="114" ry="35" fill="none" stroke="#bd7654" stroke-width="4"/><path d="M206 150H434M320 36V264" stroke="#7ba0ac" stroke-width="2"/><text x="300" y="25">北极 N</text><text x="300" y="292">南极 S</text><text x="445" y="155">赤道 0°纬线</text><text x="50" y="100">经线：南北</text><text x="50" y="210">纬线：东西</text>';
  else if (v === "rotation") {
    const angle = Math.PI / 4 + (-frame * Math.PI) / 2,
      x = 360 + 78 * Math.cos(angle),
      y = 148 + 78 * Math.sin(angle),
      day = x < 360;
    body = `<circle cx="65" cy="148" r="42" fill="#edc65d"/><text x="65" y="216" text-anchor="middle">太阳</text><path d="M125 115H231M125 148H231M125 182H231" stroke="#d7b652" stroke-width="5"/><circle cx="360" cy="148" r="104" fill="#344457"/><path d="M360 44A104 104 0 0 0 360 252Z" fill="#cce2e3"/><text x="284" y="280">昼 ← 亮面 | 暗面 → 夜</text><circle cx="${x}" cy="${y}" r="10" fill="#e79458" stroke="#fff" stroke-width="3"/><text x="493" y="104">观察点现在：</text><text x="493" y="145">${day ? "白昼" : "黑夜"}</text><text x="270" y="22">↶ 自转（从北极上空看）</text>`;
    caption =
      "北极上空视角的简化演示，忽略极昼极夜；太阳光方向固定，橙点随地球自转。四季还需公转和地轴倾斜共同解释。";
  } else if (v === "map")
    body =
      '<rect x="15" y="25" width="610" height="250" rx="16" fill="#eff0d9"/><path d="M30 210Q210 100 320 215T610 180" stroke="#6aacc4" stroke-width="14" fill="none"/><path d="M40 90H560" stroke="#b87a61" stroke-width="8"/><rect x="155" y="48" width="100" height="60" fill="#fff8dd" stroke="#7a8c77"/><text x="205" y="84" text-anchor="middle">图书馆</text><rect x="380" y="48" width="100" height="60" fill="#fff8dd" stroke="#7a8c77"/><text x="430" y="84" text-anchor="middle">校：学校</text><path d="M565 105V37l-8 12m8-12 8 12" stroke="#263438" fill="none" stroke-width="3"/><text x="560" y="25">N</text><text x="35" y="250">图例：蓝线 河流 / 红线 公路 / 校 学校</text><text x="410" y="250">比例尺 1:10000</text>';
  else if (v === "contours")
    body = `${[0, 1, 2, 3].map((n) => `<ellipse cx="${200 + n * 10}" cy="150" rx="${140 - n * 30}" ry="${108 - n * 23}" fill="none" stroke="#aa8e5d" stroke-width="3"/><text x="${60 + n * 40}" y="148">${100 + n * 100}</text>`).join("")}<text x="390" y="95">左边：线较疏</text><text x="390" y="140">右边：线较密</text><text x="390" y="200">等高距 100 米</text>`;
  else if (v === "oceans")
    body = `<rect x="40" y="70" width="560" height="90" rx="15" fill="#c5d4a1"/><path d="M55 70H438V160H55Q40 160 40 145V85Q40 70 55 70" fill="#70a9bd"/><text x="230" y="122" text-anchor="middle">海洋约 71%</text><text x="520" y="122" text-anchor="middle">陆地约 29%</text><text x="320" y="220" text-anchor="middle">示意比例条：大约七分海洋，三分陆地</text>`;
  else if (v === "continents") {
    body = world();
    caption =
      "七大洲、四大洋位置关系示意：方框不是海岸线，不表示真实形状、面积或距离；太平洋跨图的左右边界。";
  } else {
    body =
      '<path d="M30 160H240l30-20 30 40 30-40 30 40 30-20H610" fill="none" stroke="#92724f" stroke-width="12"/><path d="M80 105H240m-20-10 20 10-20 10M560 105H400m20-10-20 10 20 10" stroke="#af7559" stroke-width="5" fill="none"/><text x="110" y="70">板块运动示意</text><text x="248" y="240">交界地带通常较活跃</text>';
  }
  if (v === "rotation" && earthMode === "orbit") {
    body = `<ellipse cx="320" cy="150" rx="215" ry="95" fill="none" stroke="#a2a99c" stroke-width="2"/><circle cx="320" cy="150" r="32" fill="#e6c05a"/><text x="320" y="199" text-anchor="middle">太阳</text>${[
      [535, 150],
      [320, 245],
      [105, 150],
      [320, 55],
    ]
      .map(
        ([x, y], i) =>
          `<circle cx="${x}" cy="${y}" r="24" fill="#b8dbe4" stroke="${frame === i ? "#cf8234" : "#7199a5"}" stroke-width="4"/><path d="M${x - 13} ${y - 34}L${x + 13} ${y + 34}" stroke="#47536a" stroke-width="3"/>`,
      )
      .join(
        "",
      )}<text x="30" y="20">公转一周约一年；四处的地轴倾斜方向保持近似平行</text>`;
    caption =
      "公转及地轴倾斜共同影响四季。图中轨道、地球和太阳的大小、距离均不按比例；四季不是简单由离太阳远近决定。";
  }
  if (selected) {
    let highlight = "";
    if (["cells", "structures", "division"].includes(v))
      highlight =
        {
          wall: '<rect x="22" y="42" width="271" height="231" rx="30"/>',
          membrane:
            '<rect x="36" y="56" width="243" height="203" rx="22"/><ellipse cx="470" cy="151" rx="132" ry="103"/>',
          nucleus:
            '<circle cx="77" cy="174" r="28"/><circle cx="479" cy="149" r="34"/>',
          chloroplast:
            '<ellipse cx="70" cy="244" rx="21" ry="12"/><ellipse cx="122" cy="70" rx="21" ry="12"/>',
          vacuole: '<rect x="108" y="80" width="145" height="153" rx="37"/>',
        }[selected] || "";
    else if (v === "map")
      highlight =
        {
          north: '<circle cx="565" cy="65" r="38"/>',
          legend: '<rect x="26" y="228" width="365" height="34" rx="8"/>',
          scale: '<rect x="400" y="228" width="205" height="34" rx="8"/>',
        }[selected] || "";
    else if (v === "globe")
      highlight =
        selected === "equator"
          ? '<ellipse cx="320" cy="150" rx="114" ry="35"/>'
          : selected === "longitude"
            ? '<ellipse cx="320" cy="150" rx="54" ry="114"/>'
            : '<path d="M215 110Q320 70 425 110"/>';
    else if (v === "contours")
      highlight = `<circle cx="${selected === "dense" ? 280 : 120}" cy="150" r="45"/>`;
    else if (["living", "field"].includes(v))
      highlight = `<rect x="${selected === "plant" ? 30 : selected === "snail" ? 180 : 330}" y="60" width="140" height="160" rx="16"/>`;
    else if (v === "levels")
      highlight = `<rect x="${20 + Math.max(0, ["cell", "tissue", "organ", "system", "body"].indexOf(selected)) * 124}" y="65" width="105" height="58" rx="12"/>`;
    else if (v === "microscope")
      highlight =
        {
          eyepiece: '<circle cx="320" cy="52" r="30"/>',
          objective: '<circle cx="295" cy="129" r="26"/>',
          stage: '<ellipse cx="300" cy="164" rx="64" ry="20"/>',
          light: '<circle cx="296" cy="205" r="32"/>',
        }[selected] || "";
    if (highlight)
      body += `<g fill="none" stroke="#dd8a30" stroke-width="5" stroke-dasharray="8 4">${highlight}</g>`;
  }
  const parts = diagramParts(q),
    chosen = parts.find((p) => p[0] === selected);
  return `<section class="science-diagram"><h3>先看图，点一个线索</h3><svg viewBox="0 0 640 310" role="img" aria-label="${E(q.topic)}教学图示">${body}</svg><p class="caption">${caption}</p>${v === "rotation" ? `<div class="actions"><button id="rotateEarth">↶ ${earthMode === "orbit" ? "沿轨道走一格" : "让观察点转动一格"}</button><button id="earthMode">${earthMode === "orbit" ? "看自转与昼夜" : "看公转与地轴"}</button></div>` : ""}<div class="diagram-parts">${parts.map(([id, name]) => `<button data-region="${id}" aria-pressed="${selected === id}">${E(name)}</button>`).join("")}</div><p class="diagram-caption" role="status">${chosen ? E(chosen[1] + "：" + chosen[2]) : "点上方标签，图示旁会出现名称和一句白话解释。"}</p></section>`;
}
