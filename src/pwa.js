export function startPWA(notify, hasActiveSession, save) {
  const $ = (s) => document.querySelector(s);
  let registration,
    requested = false,
    checking = false;
  const guideStatus = (text) => {
    if ($("#homeUpdateStatus")) $("#homeUpdateStatus").textContent = text;
  };
  const failed = () => {
    $("#offline").textContent = "离线缓存未完成，请联网后重试";
    $("#cacheRetry").hidden = false;
  };
  function syncGuide() {
    const waiting = Boolean(registration?.waiting);
    if ($("#installHomeUpdate")) $("#installHomeUpdate").hidden = !waiting;
    if (waiting) {
      $("#update").hidden = false;
      $("#update").textContent = hasActiveSession()
        ? "新版本已到 · 先暂停练习再更新"
        : "有新版本，点一下更新";
      guideStatus(
        "新版已下载好。点“安装已下载的新版本”，会先等待当前保存完成，再重新打开页面。",
      );
    }
  }
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
  async function install() {
    if (hasActiveSession()) {
      notify(
        "先完成或暂停当前练习，回到首页再更新。输入和进度会保存，不需要做完整轮。",
      );
      return;
    }
    if (!registration?.waiting) {
      guideStatus("暂时还没有下载好的新版。先点“检查更新”吧。");
      return;
    }
    try {
      await save();
      requested = true;
      guideStatus("已保存，正在安装新版……");
      registration.waiting.postMessage("ACTIVATE");
    } catch {
      requested = false;
      guideStatus("这次未能确认保存完成，暂不重新打开。请稍后重试。");
    }
  }
  function watch(reg) {
    registration = reg;
    const observe = (worker) => {
      if (!worker) return;
      const update = () => {
        if (worker.state === "redundant" && !reg.active) failed();
        if (worker.state === "installing")
          guideStatus(
            "正在下载更新；下载好后会显示安装按钮，练习进度仍保存在本机。",
          );
        if (
          worker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          syncGuide();
          // The worker can become waiting just after the state event.
          queueMicrotask(syncGuide);
        }
        if (worker.state === "activated") {
          status();
          syncGuide();
        }
      };
      worker.addEventListener("statechange", update);
      update();
    };
    reg.addEventListener("updatefound", () => observe(reg.installing));
    observe(reg.installing);
    syncGuide();
    if (reg.active) status();
    $("#update").onclick = install;
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
  async function check(manual = true) {
    if (checking) return;
    if (navigator.onLine === false) {
      if (manual)
        guideStatus("先连接网络再检查更新；已经缓存的练习仍可离线使用。");
      return;
    }
    checking = true;
    const button = $("#checkForUpdate");
    if (button) button.disabled = true;
    if (manual) guideStatus("正在检查更新……");
    try {
      const reg = registration || (await register());
      if (!reg) throw Error("registration unavailable");
      await reg.update();
      syncGuide();
      if (!reg.waiting)
        guideStatus(
          reg.installing
            ? "正在下载新版，准备好后会出现安装按钮。"
            : "暂未发现新版本。如果刚发布，请稍后再检查；关闭后台再打开后，也要核对页面版本。",
        );
    } catch {
      if (manual)
        guideStatus(
          "这次未能检查更新。确认联网后再试；不需要删除图标或清除网站数据。",
        );
    } finally {
      checking = false;
      if (button?.isConnected) button.disabled = false;
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
  document.addEventListener("erin:check-update", () => check(true));
  document.addEventListener("erin:install-update", install);
  document.addEventListener("erin:update-guide-opened", syncGuide);
  if ("serviceWorker" in navigator) {
    register();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void check(false);
    });
    window.addEventListener("focus", () => {
      void check(false);
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (requested) location.reload();
      else {
        status();
        syncGuide();
      }
    });
  } else {
    $("#offline").textContent = "此浏览器暂不支持离线缓存";
    document.addEventListener("erin:check-update", () =>
      guideStatus("此浏览器不支持应用内更新，请在 Safari 中打开正式网址。"),
    );
  }
}
