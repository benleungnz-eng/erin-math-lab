import { APP_VERSION } from "./release.js";
export function updateGuideHTML() {
  return `<section class="card update-guide" aria-label="自动更新"><div class="row"><span>当前版本 v${APP_VERSION}</span><span id="homeUpdateStatus" role="status">正在自动检查更新…</span></div></section>`;
}
export function bindUpdateGuide() {
  document.dispatchEvent(new Event("erin:update-guide-opened"));
}
