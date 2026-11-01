const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
  });
  await context.addInitScript(() => {
    const D = Date;
    window.__clock = "2026-11-01T06:00:00Z";
    window.Date = class extends D {
      constructor(...a) {
        super(...(a.length ? a : [window.__clock]));
      }
      static now() {
        return new D(window.__clock).valueOf();
      }
    };
  });
  const errors = [];
  context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  const page = await context.newPage(),
    base = process.env.TEST_URL || "http://127.0.0.1:4180/";
  const get = () =>
    page.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
      return db.state;
    });
  const current = () =>
    get().then((d) => d.academy.history.sessions[d.academy.history.active]);
  await page.goto(base);
  await page.waitForSelector("#startHistory");
  assert.equal(await page.locator(".subject-cards>article").count(), 4);
  await page.locator("#startHistory").tap();
  await page.waitForSelector('[data-history-index="0"]');
  let s = await current();
  assert.equal(s.questions.length, 61);
  assert.equal(new Set(s.questions.map((q) => q.point)).size, 27);
  // Chinese IME composition must not submit prematurely.
  await page.locator('[data-history-blank="0"]').evaluate((el) => {
    el.dispatchEvent(
      new CompositionEvent("compositionstart", { bubbles: true }),
    );
    el.value = "元";
    el.dispatchEvent(
      new InputEvent("input", { bubbles: true, isComposing: true, data: "元" }),
    );
    el.closest("form").dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  assert.equal((await current()).records[0].errors, 0);
  await page
    .locator('[data-history-blank="0"]')
    .evaluate((el) =>
      el.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true }),
      ),
    );
  await page.locator('[data-history-blank="0"]').fill("中文草稿");
  await page.locator("#historyHome").tap();
  await page.locator("#startHistory").tap();
  assert.equal(
    await page.locator('[data-history-blank="0"]').inputValue(),
    "中文草稿",
  );
  await page.reload();
  await page.waitForSelector("#startHistory");
  await page.locator("#startHistory").tap();
  assert.equal(
    await page.locator('[data-history-blank="0"]').inputValue(),
    "中文草稿",
  );
  // All daily items render their matching image and can be studied without penalty.
  fs.mkdirSync("artifacts/history", { recursive: true });
  const first = s.questions;
  while (!(s = await current()).completed) {
    const q = s.questions[s.index];
    const image = page.locator(".history-layout img.history-image");
    await image.evaluate((img) => img.decode());
    assert.ok(await image.evaluate((img) => img.naturalWidth > 0));
    if (s.index === 0) {
      const wrong = q.answers.map((a, i) => (i === 0 ? "继续想" : a));
      for (let i = 0; i < wrong.length; i++)
        await page.locator(`[data-history-blank="${i}"]`).fill(wrong[i]);
      await page.locator("#historySubmit").tap();
      await page.waitForFunction(() =>
        document
          .querySelector("#historyFeedback")
          ?.textContent.includes("空已对上"),
      );
      const r = (await current()).records[0];
      assert.equal(r.errors, 1);
      assert.equal(r.checked[0], false);
      assert.ok(r.checked.slice(1).every(Boolean));
      for (let i = 0; i < q.answers.length; i++)
        await page.locator(`[data-history-blank="${i}"]`).fill(q.answers[i]);
      await page.locator("#historySubmit").tap();
      await page.waitForSelector("#historyNext:visible");
      await page.screenshot({
        path: "artifacts/history/ipad-correct.png",
        fullPage: true,
      });
      await page.locator("#historyNext").tap();
    } else {
      await page.locator("#historyHint1").tap();
      await page.waitForSelector(".step");
      await page.locator("#historyHint2").tap();
      await page.locator("#historyExplain").tap();
      await page.waitForSelector("#historySolution");
      assert.ok(
        (await page.locator("#historySolution").textContent()).includes(
          q.answers[0],
        ),
      );
      await page.locator("#historyStudied").tap();
    }
    await page.waitForFunction(
      (index) =>
        document.querySelector("#historyFinish") ||
        Number(
          document.querySelector("[data-history-index]")?.dataset.historyIndex,
        ) !== index,
      s.index,
    );
  }
  assert.equal((await current()).index, 61);
  assert.equal(
    (await current()).records.filter((r) => r.mode === "studied").length,
    60,
  );
  await page.locator("#historyShare").tap();
  await page.waitForSelector("#downloadReport");
  const report = await page.evaluate(async () => {
    const { db } = await import("./src/app.js");
    const { makeReport, validateReport } = await import("./src/reports.js");
    return validateReport(makeReport(db.state));
  });
  assert.equal(
    report.records.filter((r) => r.subject === "history").length,
    61,
  );
  // Close modal through Escape if supported; reload from durable IndexedDB.
  await page.reload();
  await page.waitForSelector("#startHistory");
  await page.evaluate(() => (window.__clock = "2026-11-02T06:00:00Z"));
  await page.locator("#startHistory").tap();
  const next = await current();
  assert.equal(next.questions.length, 61);
  for (const q of next.questions)
    assert.notEqual(q.prompt, first.find((x) => x.rowId === q.rowId).prompt);
  assert.equal(Object.keys((await get()).academy.history.sessions).length, 2);
  // Touch-sized controls and no horizontal overflow across supported screens.
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
  ]) {
    await page.setViewportSize(viewport);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    const box = await page.locator('[data-history-blank="0"]').boundingBox();
    assert.ok(box.height >= 44);
  }
  await page.screenshot({
    path: "artifacts/history/ipad-daily.png",
    fullPage: true,
  });
  await page.locator("#historyHome").tap();
  await page.locator("#startBiology").tap();
  await page.waitForSelector("[data-science-index]");
  await page.locator("#scienceHome").tap();
  await page.locator("#startGeography").tap();
  await page.waitForSelector("[data-science-index]");
  await page.locator("#scienceHome").tap();
  await page.locator("#start").tap();
  await page.waitForSelector("#answerArea");
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "History browser: 61 images/27 points, Chinese composition, per-blank checking, resume, daily variants, report, existing subjects and touch viewports passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
