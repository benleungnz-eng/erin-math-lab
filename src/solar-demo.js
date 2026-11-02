import { diagramQuestion, guideTarget } from "./science-visuals.js";
import { solarFocus } from "./solar-model.js";
let activeDialog = null;
export function supportsSolarDemo(question) {
  const q = diagramQuestion(question);
  return q.subject === "geography" && ["globe", "rotation"].includes(q.visual);
}
export function openSolarDemo(question, onObserve = () => {}) {
  if (activeDialog || !supportsSolarDemo(question)) return;
  const q = diagramQuestion(question),
    target = guideTarget(q)[0];
  const opener = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.className = "solar-dialog";
  dialog.setAttribute("aria-label", "日地月三维互动演示");
  const frame = document.createElement("iframe");
  frame.title = "日地月三维观察舱";
  const url = new URL("./public/solar/index.html", document.baseURI);
  url.searchParams.set("focus", solarFocus(target));
  url.searchParams.set("prompt", q.prompt);
  frame.src = url.href;
  dialog.append(frame);
  document.body.append(dialog);
  activeDialog = dialog;
  const close = () => {
    window.removeEventListener("message", message);
    dialog.remove();
    activeDialog = null;
    if (opener?.isConnected) opener.focus();
  };
  const message = (event) => {
    if (
      event.origin !== location.origin ||
      event.source !== frame.contentWindow
    )
      return;
    if (event.data?.type === "erin:solar-close") dialog.close();
    if (
      event.data?.type === "erin:solar-observe" &&
      [
        "equator",
        "latitude",
        "longitude",
        "day",
        "night",
        "spin",
        "orbit",
      ].includes(event.data.region)
    )
      Promise.resolve(onObserve(event.data.region)).catch(() => {});
  };
  window.addEventListener("message", message);
  dialog.addEventListener("close", close, { once: true });
  dialog.showModal();
  frame.focus();
}
