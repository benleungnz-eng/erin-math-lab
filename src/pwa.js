export function startPWA(notify, hasActiveSession, save) {
  const $ = (s) => document.querySelector(s);
  let registration,
    requested = false;
  const failed = () => {
    $("#offline").textContent = "离线缓存未完成，请联网后重试";
    $("#cacheRetry").hidden = false;
  };
  async function status() {
    const reg = registration;
    if (!reg?.active) return;
    const channel = new MessageChannel();
    channel.port1.onmessage = (e) => {
      $("#offline").textContent = e.data.ready
        ? "离线已就绪 · 所有学习与建造资源已缓存"
        : "离线缓存缺少资源，请重试";
      $("#cacheRetry").hidden = e.data.ready;
    };
    reg.active.postMessage("STATUS", [channel.port2]);
  }
  function watch(reg) {
    registration = reg;
    const offer = () => {
      $("#update").hidden = false;
      $("#update").textContent = hasActiveSession()
        ? "新版本已到 · 当前练习完成后更新"
        : "有新版本，点一下更新";
    };
    const observe = (w) => {
      if (!w) return;
      const update = () => {
        if (w.state === "redundant" && !reg.active) failed();
        if (w.state === "installed" && navigator.serviceWorker.controller)
          offer();
        if (w.state === "activated") status();
      };
      w.addEventListener("statechange", update);
      update();
    };
    reg.addEventListener("updatefound", () => observe(reg.installing));
    observe(reg.installing);
    if (reg.waiting) offer();
    if (reg.active) status();
    $("#update").onclick = async () => {
      if (hasActiveSession()) {
        notify(
          "先完成或稍后再练当前关卡，再到这里更新。当前进度不会被自动刷新。",
        );
        return;
      }
      await save();
      requested = true;
      reg.waiting?.postMessage("ACTIVATE");
    };
  }
  async function register() {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      watch(reg);
      navigator.serviceWorker.ready.then(status);
      return reg;
    } catch {
      failed();
    }
  }
  $("#cacheRetry").onclick = async () => {
    try {
      const reg = await register();
      await reg?.update();
    } catch {
      failed();
    }
  };
  if ("serviceWorker" in navigator) {
    register();
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (requested) location.reload();
      else status();
    });
  } else $("#offline").textContent = "此浏览器暂不支持离线缓存";
}
