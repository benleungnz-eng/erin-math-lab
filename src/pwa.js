export function startPWA(
  notify,
  hasActiveSession,
  save,
  isHome = () => !hasActiveSession(),
) {
  const $ = (s) => document.querySelector(s);
  let registration,
    checking = false,
    reloading = false,
    activating = false,
    lastCheck = 0;
  let message = "正在自动检查更新…";
  const show = (text = message) => {
    message = text;
    if ($("#homeUpdateStatus")) $("#homeUpdateStatus").textContent = text;
    if ($("#update")) $("#update").hidden = true;
  };
  function status() {
    if (!registration?.active) return;
    const channel = new MessageChannel();
    channel.port1.onmessage = ({ data }) => {
      $("#offline").textContent = data.ready
        ? "离线已就绪 · 所有学习与建造资源已缓存"
        : "离线缓存缺少资源，请重试";
      $("#cacheRetry").hidden = data.ready;
      channel.port1.close();
    };
    registration.active.postMessage("STATUS", [channel.port2]);
  }
  async function install() {
    if (!registration?.waiting || activating || reloading) return;
    if (
      hasActiveSession() ||
      !isHome() ||
      document.visibilityState !== "visible"
    ) {
      show("新版已准备好，回到首页后自动更新");
      return;
    }
    activating = true;
    try {
      await save();
      if (hasActiveSession() || !isHome()) return;
      show("正在更新，马上就好…");
      registration.waiting?.postMessage("ACTIVATE");
    } catch {
      show("暂时无法更新，稍后会自动重试");
    } finally {
      activating = false;
    }
  }
  function failed() {
    $("#offline").textContent = "离线缓存未完成，请联网后重试";
    $("#cacheRetry").hidden = false;
  }
  function watch(reg) {
    registration = reg;
    const observe = (worker) => {
      if (!worker) return;
      const changed = () => {
        if (worker.state === "installing") show("正在后台下载更新…");
        if (worker.state === "installed") setTimeout(() => void install(), 0);
        if (worker.state === "activated") status();
        if (worker.state === "redundant") {
          show("更新未完成，继续使用当前版本");
          if (!reg.active) failed();
        }
      };
      worker.addEventListener("statechange", changed);
      changed();
    };
    reg.addEventListener("updatefound", () => observe(reg.installing));
    observe(reg.installing);
    status();
    void install();
  }
  async function register() {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js", {
        updateViaCache: "none",
      });
      watch(reg);
      navigator.serviceWorker.ready.then(status);
      return reg;
    } catch {
      failed();
    }
  }
  async function check(force = false) {
    if (checking) return;
    if (navigator.onLine === false) {
      show("离线使用中，联网后自动检查更新");
      return;
    }
    void install();
    if (!force && Date.now() - lastCheck < 30000) return;
    checking = true;
    lastCheck = Date.now();
    try {
      const reg =
        registration &&
        (registration.active || registration.installing || registration.waiting)
          ? registration
          : await register();
      if (!reg) throw Error("registration unavailable");
      // Registration already starts the first installation. Calling update()
      // during it can keep the check pending after an installation failure.
      if (reg.installing && !reg.active) {
        show("正在准备离线资源…");
        return;
      }
      await reg.update();
      if (reg.waiting) await install();
      else show(reg.installing ? "正在后台下载更新…" : "已自动检查更新");
    } catch {
      show("暂时无法检查，稍后会自动重试");
    } finally {
      checking = false;
    }
  }
  document.addEventListener("erin:update-guide-opened", () => {
    show();
    void install();
  });
  document.addEventListener("erin:check-update", () => void check(true));
  document.addEventListener("erin:install-update", () => void install());
  if (!("serviceWorker" in navigator)) {
    $("#offline").textContent = "此浏览器暂不支持离线缓存";
    show("此浏览器暂不支持自动更新");
    return;
  }
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("message", async (event) => {
    if (event.data !== "UPDATE_SAFE") return;
    let ready = !hasActiveSession() && isHome();
    try {
      if (ready) await save();
    } catch {
      ready = false;
    }
    event.ports[0]?.postMessage(ready && !hasActiveSession() && isHome());
  });
  navigator.serviceWorker.addEventListener("controllerchange", async () => {
    if (!hadController) {
      hadController = true;
      status();
      return;
    }
    if (reloading || hasActiveSession() || !isHome()) return;
    try {
      await save();
      if (reloading || hasActiveSession() || !isHome()) return;
      reloading = true;
      location.reload();
    } catch {
      show("暂时无法更新，稍后会自动重试");
    }
  });
  $("#cacheRetry").onclick = () => void check(true);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void check();
  });
  window.addEventListener("focus", () => void check());
  window.addEventListener("online", () => void check(true));
  setInterval(() => {
    if (document.visibilityState === "visible") void check();
  }, 60000);
  void check(true);
}
