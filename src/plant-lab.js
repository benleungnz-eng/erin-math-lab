import { observationNotes } from "./content/observation-notes.js";
const experiments = new Map();
export function plantScene() {
  return '<g class="plant-light-source"><circle cx="525" cy="80" r="35" fill="#edc65d"/><path d="M525 30V18m0 124v-12m-50-50h-12m124 0h-12m-87-37-9-9m74 83 9 9m-9-83 9-9m-74 83-9 9" stroke="#dfb145" stroke-width="4"/><text x="525" y="155" text-anchor="middle">点太阳</text></g><path class="plant-rays" d="M480 80 375 120" stroke="#dfbd52" stroke-width="5" stroke-dasharray="8 5"/><image class="sunflower-illustration" href="./public/assets/observation/sunflower-0.webp" x="160" y="35" width="280" height="240" preserveAspectRatio="xMidYMid meet"/><text class="plant-stage-label" x="320" y="298" text-anchor="middle">先看看幼苗，再点太阳开始观察</text>';
}
export function plantControls() {
  return '<section class="plant-controls" aria-label="向日葵幼苗观察实验"><div class="actions"><button data-plant="grow">看看幼苗慢慢的变化</button><button data-plant="side">换到左边，重新观察</button><button data-plant="reset">重新观察这一轮</button></div><label>观察时间<input class="plant-time" type="range" min="0" max="2" step="1" value="0"><output class="plant-time-label">刚开始</output></label><p class="plant-status" role="status">光在右边。点太阳，或拖动时间条，找找幼苗的变化。</p><p class="caption">这里把一段时间里的生长压缩成三幅图，方便比较；幼苗不会瞬间转头。换边会重新开始一个对照观察。</p></section>';
}
export function mountPlantLab(root, key, observed) {
  const image = root.querySelector(".sunflower-illustration");
  if (!image) return;
  const state = experiments.get(key) || { side: "right", stage: 0 };
  experiments.set(key, state);
  let timer = null;
  const names = ["刚开始", "过了一段时间", "又过了一段时间"];
  const status = root.querySelector(".plant-status"),
    slider = root.querySelector(".plant-time");
  function render() {
    root
      .querySelector('[data-highlight="light"]')
      ?.setAttribute(
        "transform",
        state.side === "left" ? "translate(-410 0)" : "",
      );
    image.setAttribute(
      "href",
      `./public/assets/observation/sunflower-${state.stage}.webp`,
    );
    image.setAttribute(
      "transform",
      state.side === "left" ? "translate(600 0) scale(-1 1)" : "",
    );
    root
      .querySelector(".plant-light-source")
      .setAttribute(
        "transform",
        state.side === "left" ? "translate(-410 0)" : "",
      );
    root
      .querySelector(".plant-rays")
      .setAttribute(
        "d",
        state.side === "left" ? "M160 80 250 120" : "M480 80 375 120",
      );
    root
      .querySelector('svg [data-region="light"]')
      .setAttribute(
        "transform",
        state.side === "left" ? "translate(-410 0)" : "",
      );
    root.querySelector(".plant-stage-label").textContent =
      names[state.stage] +
      "：" +
      (state.stage === 0
        ? "先记住幼苗现在的位置"
        : "看看茎尖向有光的一边靠近了多少");
    slider.value = String(state.stage);
    root.querySelector('[data-plant="grow"]').textContent =
      state.stage === 2 ? "再看一遍生长变化" : "看看幼苗慢慢的变化";
    root.querySelector(".plant-time-label").textContent = names[state.stage];
    root.querySelector('[data-plant="side"]').textContent =
      `换到${state.side === "right" ? "左" : "右"}边，重新观察`;
    status.textContent = `光在${state.side === "right" ? "右" : "左"}边。${state.stage === 0 ? "我还直直地站着，记住我现在的样子吧！" : state.stage === 1 ? "过了一段时间，我的茎尖开始向有光的方向靠近啦。" : "又过了一段时间，我朝着光的一边长出了更明显的弯曲。"}`;
    image.dataset.stage = String(state.stage);
    image.dataset.lightSide = state.side;
  }
  async function note(region) {
    await observed(region);
    const label = region === "light" ? "光照方向" : "幼苗的反应",
      p = root.querySelector(".diagram-caption");
    p.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = label + " · 观察小记";
    const text = document.createElement("span");
    text.textContent = observationNotes.stimulus[region];
    p.append(strong, text);
    root
      .querySelectorAll("[data-region]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.region === region)),
      );
  }
  async function grow() {
    clearTimeout(timer);
    state.stage = state.stage === 2 ? 0 : state.stage + 1;
    render();
    await note("light");
    function advance() {
      if (state.stage < 2)
        timer = setTimeout(() => {
          if (image.isConnected) {
            state.stage += 1;
            render();
            advance();
          }
        }, 1000);
    }
    advance();
  }
  root
    .querySelectorAll('[data-region="light"]')
    .forEach((b) => (b.onclick = grow));
  root
    .querySelectorAll('[data-region="response"]')
    .forEach((b) => (b.onclick = () => note("response")));
  root.querySelector('[data-plant="grow"]').onclick = grow;
  root.querySelector('[data-plant="side"]').onclick = () => {
    clearTimeout(timer);
    state.side = state.side === "right" ? "left" : "right";
    state.stage = 0;
    render();
  };
  root.querySelector('[data-plant="reset"]').onclick = () => {
    clearTimeout(timer);
    state.stage = 0;
    render();
  };
  slider.oninput = () => {
    clearTimeout(timer);
    state.stage = Number(slider.value);
    render();
  };
  slider.onchange = () => note("response");
  render();
}
