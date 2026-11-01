const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 820, height: 1180 },
  });
  const errors = [],
    requests = [];
  ctx.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  ctx.on("request", (r) => requests.push(r.url()));
  const page = await ctx.newPage();
  const base = process.env.TEST_URL || "http://127.0.0.1:4180/";
  const get = () =>
    page.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
      return db.state;
    });
  await page.goto(base);
  await page.waitForSelector("#start");
  assert.equal(await page.locator("[data-partner]:not([disabled])").count(), 3);
  await page.click("#start");
  let d = await get();
  let s = d.sessions[d.active];
  const q = s.questions[0];
  if (q.choices)
    await page.locator(`[data-choice="${q.correctAnswer[0]}"]`).click();
  else
    for (let i = 0; i < q.correctAnswer.length; i++) {
      let r = q.correctAnswer[i];
      await page
        .locator(`[data-answer="${i}"]`)
        .fill(r.d === 1 ? String(r.n) : `${r.n}/${r.d}`);
    }
  await get();
  await page.click("#submitAnswer");
  await page.waitForSelector(".correct-celebration");
  assert.match(await page.locator("#feedback").textContent(), /答对了/);
  assert.match(await page.locator("#nextQuestion").textContent(), /下一题/);
  fs.mkdirSync("artifacts/upgrade", { recursive: true });
  await page.waitForTimeout(450);
  await page.screenshot({
    path: "artifacts/upgrade/correct-ipad.png",
    fullPage: true,
  });
  await page.waitForTimeout(3200);
  assert.equal(await page.locator(".correct-celebration").count(), 0);
  assert.equal((await get()).sessions[d.active].index, 0);
  const saved = await get();
  await page.reload();
  await page.click("#start");
  assert.equal(await page.locator(".correct-celebration").count(), 0);
  d = await get();
  assert.deepEqual(d.sessions, saved.sessions);
  assert.deepEqual(d.inventory, saved.inventory);
  await page.click("#nextQuestion");
  await page.click("#explain");
  await page.click("#finishStudying");
  await page.waitForFunction(() =>
    document.querySelector("#feedback").textContent.includes("这题学完了"),
  );
  assert.match(await page.locator("#feedback").textContent(), /这题学完了/);
  assert.equal((await get()).sessions[d.active].index, 1);
  await page.click("#nextQuestion");
  await page.click('[data-view="reports"]');
  await page.click("#studentReport");
  const fileEvent = page.waitForEvent("download");
  await page.click("#downloadReport");
  const dl = await fileEvent;
  const text = fs.readFileSync(await dl.path(), "utf8");
  const report = JSON.parse(text);
  assert.equal(report.records.length, 2);
  assert.ok(!/draft|layout|input|reflection/.test(text));
  await page.click("#closeDialog");
  const student = await get();
  const payload = {
    name: "report.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  };
  await page.locator("#importReport").setInputFiles(payload);
  await page.waitForFunction(() =>
    document.querySelector("#parentStatus").textContent.includes("已导入"),
  );
  await page.locator("#importReport").setInputFiles(payload);
  await page.waitForFunction(() =>
    document.querySelector("#parentStatus").textContent.includes("已导入"),
  );
  assert.match(await page.locator(".report-metrics").textContent(), /2 题/);
  assert.deepEqual(await get(), student);
  await page.locator("#importReport").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await page.waitForFunction(() =>
    document.querySelector("#parentStatus").textContent.includes("未导入"),
  );
  assert.match(await page.locator(".report-metrics").textContent(), /2 题/);
  await page.screenshot({
    path: "artifacts/upgrade/parent-report-ipad.png",
    fullPage: true,
  });
  const parent = await ctx.newPage();
  await parent.goto(base + "#reports");
  await parent.click('[data-view="reports"]');
  assert.match(await parent.locator(".report-metrics").textContent(), /2 题/);
  await parent.close();
  assert.equal(
    await page.locator('[data-view="studio"],[data-view="world"]').count(),
    0,
  );
  await page.click('[data-view="settings"]');
  await page.click("#reduce");
  await get();
  assert.equal((await get()).prefs.reduced, true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.click('[data-view="home"]');
  await page.screenshot({
    path: "artifacts/upgrade/home-ipad.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  for (const view of ["home", "reports", "collection", "progress"]) {
    await page.click(`[data-view="${view}"]`);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      view + " fits phone",
    );
  }
  await page.waitForFunction(() =>
    document.querySelector("#offline").textContent.includes("离线已就绪"),
  );
  await ctx.setOffline(true);
  await page.reload();
  await page.click('[data-view="reports"]');
  assert.match(await page.locator(".report-metrics").textContent(), /2 题/);
  assert.equal(
    await page.evaluate(() =>
      getComputedStyle(
        document.querySelector(".character") || document.body,
      ).backgroundImage.includes("http"),
    ),
    false,
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.ok(
    requests.every((u) => u.startsWith(new URL(base).origin)),
    "all requests same origin",
  );
  console.log(
    "PASS upgrade: original partner collection, short correct feedback, explicit next, refresh safety, study status, file download, parent imports/dedup/rejection/persistence, student isolation, removed retired views, reduced motion, phone layout, offline reports",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
