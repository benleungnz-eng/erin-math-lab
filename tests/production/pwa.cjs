const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const initialVersion = JSON.parse(
    fs.readFileSync("package.json", "utf8"),
  ).version;
  const updatedVersion = initialVersion + "-pwa-test";
  let version = initialVersion,
    fail = true;
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://local").pathname;
    if (!pathname.startsWith("/station/")) {
      res.writeHead(404).end();
      return;
    }
    const file = pathname.slice("/station/".length) || "index.html";
    if (file.includes("..")) {
      res.writeHead(403).end();
      return;
    }
    if (fail && file === "public/assets/gu.svg") {
      res.writeHead(503).end("test install failure");
      return;
    }
    const target = path.join(process.cwd(), "dist", file);
    if (!fs.existsSync(target)) {
      res.writeHead(404).end();
      return;
    }
    const mime = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".webmanifest": "application/manifest+json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".webp": "image/webp",
    };
    res.setHeader(
      "Content-Type",
      mime[path.extname(file)] || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-store");
    let body = fs.readFileSync(target);
    if (file === "sw.js")
      body = Buffer.from(
        body.toString().replaceAll("v" + initialVersion, "v" + version),
      );
    res.end(body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext(),
    page = await context.newPage(),
    url = "http://127.0.0.1:" + server.address().port + "/station/";
  await page.goto(url);
  await page.waitForFunction(() =>
    document.querySelector("#offline").textContent.includes("未完成"),
  );
  assert.ok(!(await page.locator("#offline").textContent()).includes("已就绪"));
  console.log("PASS cache failure never falsely reports offline ready");
  fail = false;
  await page.click("#cacheRetry");
  await page.waitForFunction(() =>
    document.querySelector("#offline").textContent.includes("离线已就绪"),
  );
  console.log(
    "PASS failed full install retries successfully under a deployment subpath",
  );
  await page.evaluate(() => caches.open("other-app-sentinel"));
  await page.click("#start");
  await page.waitForSelector("#explain");
  version = updatedVersion;
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update();
  });
  await page.waitForSelector("#update:not([hidden])");
  await page.click("#update");
  assert.match(await page.locator("#notice").textContent(), /先完成/);
  assert.equal(await page.locator("#explain").count(), 1);
  console.log(
    "PASS waiting update never forcibly reloads an unfinished session",
  );
  while (await page.locator("#explain").count()) {
    await page.click("#explain");
    await page.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
    });
    await page.click("#finishStudying");
    await page.click("#nextQuestion");
    await page.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
    });
  }
  await page.waitForFunction(async () => {
    const { db } = await import("./src/app.js");
    const s = db.state.sessions[db.state.active];
    const event = s.partnerReward?.partner
      ? "unlock"
      : s.stage
        ? "bonus"
        : "complete";
    return db.state.academy.effects[`${s.partnerId}:${event}`]?.length > 0;
  });
  const saved = await page.evaluate(async () => {
    const { db } = await import("./src/app.js");
    return db.state;
  });
  await page.click("#update");
  await page.waitForFunction(async (expectedVersion) => {
    const keys = await caches.keys();
    return keys.some((k) => k.includes("v" + expectedVersion));
  }, updatedVersion);
  await page.waitForSelector("#start");
  assert.deepEqual(
    await page.evaluate(async () => {
      const { db } = await import("./src/app.js");
      return db.state;
    }),
    saved,
  );
  assert.ok(
    (await page.evaluate(() => caches.keys())).includes("other-app-sentinel"),
  );
  console.log(
    "PASS explicit update preserves records and other application caches",
  );
  await context.setOffline(true);
  await page.close();
  const offline = await context.newPage();
  await offline.goto(url);
  await offline.click("#start");
  await offline.waitForFunction(() =>
    document.querySelector("main").textContent.includes("今天已经完成"),
  );
  assert.match(await offline.locator("main").textContent(), /今天已经完成/);
  console.log(
    "PASS updated version reopens offline under subpath with completed session intact",
  );
  await context.setOffline(false);
  await offline.click('[data-view="home"]');
  await offline.waitForSelector("#checkForUpdate");
  assert.match(
    await offline.locator(".update-guide").textContent(),
    /向上划掉/,
  );
  await offline.click("#startBiology");
  await offline.waitForSelector("[data-science-index]");
  await offline.click('[data-view="home"]');
  const pausedScience = await offline.evaluate(async () => {
    const { db } = await import("./src/app.js");
    await db.serial;
    return structuredClone(db.state.academy.science);
  });
  version = initialVersion + "-paused-update-test";
  await offline.click("#checkForUpdate");
  await offline.waitForSelector("#installHomeUpdate:not([hidden])");
  await offline.click("#installHomeUpdate");
  await offline.waitForSelector("#checkForUpdate");
  await offline.waitForFunction(
    async (expected) =>
      (await caches.keys()).some((k) => k.includes("v" + expected)),
    version,
  );
  assert.deepEqual(
    await offline.evaluate(async () => {
      const { db } = await import("./src/app.js");
      return db.state.academy.science;
    }),
    pausedScience,
  );
  await context.setOffline(true);
  await offline.click("#checkForUpdate");
  await offline.waitForFunction(() =>
    document
      .querySelector("#homeUpdateStatus")
      .textContent.includes("先连接网络"),
  );
  assert.ok(
    !(await offline.locator("#homeUpdateStatus").textContent()).includes(
      "已是最新",
    ),
  );
  await context.setOffline(false);
  console.log(
    "PASS home update guide installs after pausing, preserves science progress, and reports offline honestly",
  );
  await offline.evaluate(async () => {
    const { db } = await import("./src/app.js");
    await db.mutate((d) => (d.schema = 999));
  });
  await offline.reload();
  await offline.waitForSelector("#start");
  assert.match(await offline.locator("#notice").textContent(), /保存暂不可用/);
  await offline.click("#start");
  await offline.waitForSelector("#explain");
  console.log(
    "PASS corrupt stored schema opens temporary practice without overwriting original",
  );
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  console.log("7 PWA resilience scenarios passed");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
