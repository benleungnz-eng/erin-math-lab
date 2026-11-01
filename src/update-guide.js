import { APP_VERSION } from "./release.js";
export function updateGuideHTML() {
  return `<section class="card update-guide" aria-label="iPad 主屏幕版更新说明"><div class="row"><div><p class="eyebrow">IPAD · KEEP YOUR DISCOVERIES</p><h2>主屏幕版怎样更新？</h2></div><span class="pill">当前页面 v${APP_VERSION}</span></div><ol><li>先连上网络，回到这里，点<strong>检查更新</strong>。</li><li>出现<strong>安装已下载的新版本</strong>后点一下；页面会重新打开。等底部显示<strong>离线已就绪</strong>再开始。</li><li>如果仍是旧页面：从 iPad 屏幕底部向上轻扫，在中间停一下 → 找到 <strong>Erin Math Lab（方块航站）</strong> 卡片并向上划掉 → 再点主屏幕图标打开，然后再检查更新。</li></ol><p class="caption">有主屏幕按钮的 iPad，可连按两次按钮打开后台。关掉后台再打开不一定已经更新完成，要看页面版本和“离线已就绪”。如果 Safari 也开着本站，可关掉那个网页再试；无需删除图标或清除网站数据，以免丢失本机记录。</p><div class="actions"><button id="checkForUpdate" class="primary">检查更新</button><button id="installHomeUpdate" class="gold" hidden>安装已下载的新版本</button></div><p id="homeUpdateStatus" role="status">练习可以先暂停；回到首页后更新，已保存的进度会保留。</p></section>`;
}
export function bindUpdateGuide(main) {
  main.querySelector("#checkForUpdate").onclick = () =>
    document.dispatchEvent(new Event("erin:check-update"));
  main.querySelector("#installHomeUpdate").onclick = () =>
    document.dispatchEvent(new Event("erin:install-update"));
  document.dispatchEvent(new Event("erin:update-guide-opened"));
}
