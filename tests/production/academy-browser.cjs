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
    const RealDate = Date;
    window.__clock = "2026-11-01T06:00:00Z";
    window.Date = class extends RealDate {
      constructor(...args) {
        super(...(args.length ? args : [window.__clock]));
      }
      static now() {
        return new RealDate(window.__clock).valueOf();
      }
    };
  });
  const errors = [],
    requests = [];
  context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  context.on("request", (r) => requests.push(r.url()));
  const page = await context.newPage(),
    base = process.env.TEST_URL || "http://127.0.0.1:4180/";
  const get = () =>
    page.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
      return db.state;
    });
  await page.goto(base);
  await page.waitForSelector("#startBiology");
  fs.mkdirSync("artifacts/academy", { recursive: true });
  assert.equal(
    await page.locator("#start,#startBiology,#startGeography").count(),
    3,
  );
  assert.equal(await page.locator("[data-partner]:not([disabled])").count(), 3);
  await page.locator('[data-partner="gu"]').tap();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-partner="gu"]')
        .getAttribute("aria-pressed") === "true",
  );
  await page.screenshot({
    path: "artifacts/academy/home-ipad.png",
    fullPage: true,
  });
  const originalInventory = (await get()).inventory;
  const current = (sub) =>
    get().then(
      (d) => d.academy.science.sessions[d.academy.science.active[sub]],
    );
  async function next(sub) {
    const s = await current(sub);
    await page.locator("#scienceNext").tap();
    await page.waitForFunction(
      (index) =>
        document.querySelector("#scienceFinish") ||
        Number(
          document.querySelector("[data-science-index]")?.dataset.scienceIndex,
        ) !== index,
      s.index,
    );
    await get();
  }
  async function solve(sub) {
    let s = await current(sub);
    while (!s.completed) {
      const q = s.questions[s.index];
      await page
        .locator("[data-science-choice]")
        .filter({ hasText: q.answer })
        .tap();
      await get();
      await page.locator("#scienceSubmit").tap();
      await page.waitForSelector("#scienceNext:not([hidden])");
      await next(sub);
      s = await current(sub);
    }
  }
  for (let day = 0; day < 7; day++) {
    await page.evaluate(
      (day) =>
        (window.__clock = `2026-11-${String(day + 1).padStart(2, "0")}T06:00:00Z`),
      day,
    );
    for (const sub of ["biology", "geography"]) {
      await page.locator('[data-view="home"]').tap();
      await page
        .locator(sub === "biology" ? "#startBiology" : "#startGeography")
        .tap();
      await page.waitForSelector("[data-science-choice]");
      let s = await current(sub);
      assert.equal(s.day, day);
      assert.equal(s.questions.length, 4);
      assert.equal(
        await page.locator("#partnerStage").getAttribute("data-partner-id"),
        s.partnerId,
      );
      if (day === 0 && sub === "biology") {
        const wrong = s.questions[0].choices.find(
          (c) => c !== s.questions[0].answer,
        );
        await page
          .locator("[data-science-choice]")
          .filter({ hasText: wrong })
          .tap();
        await get();
        await page.locator("#scienceSubmit").tap();
        await page.waitForFunction(
          () =>
            document.querySelector("#partnerStage").dataset.state ===
            "wrong_soft",
        );
        await page.locator("#scienceSubmit").tap();
        await page.waitForFunction(
          () =>
            document.querySelector("#partnerStage").dataset.state ===
            "wrong_retry",
        );
        await page.locator("#scienceHint2").tap();
        await page.waitForSelector("#checkScienceStep");
        await page.locator("#checkScienceStep").tap();
        assert.match(
          await page.locator("#scienceStepFeedback").textContent(),
          /先点/,
        );
        await page.locator("button[data-region]").first().tap();
        await page.locator("#checkScienceStep").tap();
        await page.waitForFunction(() =>
          document
            .querySelector("#scienceStepFeedback")
            .textContent.includes("已经看懂"),
        );
        await page.locator("#scienceExplain").tap();
        await page.waitForSelector("#scienceStudied");
        await page.locator("#scienceStudied").tap();
        await page.waitForSelector("#scienceNext:not([hidden])");
        assert.match(
          await page.locator("#scienceFeedback").textContent(),
          /学完/,
        );
        const saved = await current(sub);
        await page.reload();
        await page.locator("#startBiology").tap();
        await page.waitForSelector("#scienceNext:not([hidden])");
        assert.equal((await current(sub)).records[0].errors, 2);
        assert.equal((await current(sub)).id, saved.id);
        await page.locator('[data-view="home"]').tap();
        await page.locator('[data-partner="kirby"]').tap();
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-partner="kirby"]')
              .getAttribute("aria-pressed") === "true",
        );
        await page.locator("#startBiology").tap();
        await page.waitForSelector("#scienceNext:not([hidden])");
        assert.equal(
          await page.locator("#partnerStage").getAttribute("data-partner-id"),
          "gu",
        );
        await next(sub);
      }
      if (day === 3 && sub === "biology") {
        await page.locator('button[data-region="membrane"]').tap();
        await page.waitForFunction(() =>
          document
            .querySelector(".diagram-caption")
            .textContent.includes("控制物质进出"),
        );
        assert.match(
          await page.locator(".diagram-caption").textContent(),
          /控制物质进出/,
        );
        assert.ok(
          await page.locator('.science-diagram svg [stroke="#dd8a30"]').count(),
        );
        await page.screenshot({
          path: "artifacts/academy/cells-ipad.png",
          fullPage: true,
        });
      }
      if (day === 1 && sub === "geography") {
        await page.locator("#earthReference > summary").tap();
        const svg = await page.locator(".science-diagram svg").innerHTML();
        await page.locator("#rotateEarth").tap();
        assert.notEqual(
          await page.locator(".science-diagram svg").innerHTML(),
          svg,
        );
        await page.locator("#earthMode").tap();
        assert.match(
          await page.locator(".science-diagram").textContent(),
          /一年/,
        );
        await page.screenshot({
          path: "artifacts/academy/earth-motion-ipad.png",
          fullPage: true,
        });
      }
      await solve(sub);
      assert.ok((await current(sub)).completed);
      await page.locator("#scienceBonus").tap();
      await page.waitForSelector("[data-science-choice]");
      assert.equal((await current(sub)).questions.length, 2);
      await solve(sub);
      assert.deepEqual((await get()).inventory, originalInventory);
    }
  }
  let d = await get();
  assert.equal(d.academy.science.nextDay.biology, 7);
  assert.equal(d.academy.science.nextDay.geography, 7);
  assert.equal(Object.keys(d.academy.science.sessions).length, 28);
  assert.equal(d.academy.unlocked.length, 12);
  assert.equal(d.academy.stars, 19);
  await page.locator('[data-view="home"]').tap();
  assert.equal(
    await page.locator("[data-partner]:not([disabled])").count(),
    12,
  );
  await page.locator("#start").tap();
  await page.waitForSelector("#submitAnswer");
  const q = (d = await get());
  const math = q.sessions[q.active];
  if (!math.questions[0].choices) {
    await page.locator('[data-answer="0"]').tap();
    await page.locator('[data-key="1"]').tap();
    assert.equal(await page.locator('[data-answer="0"]').inputValue(), "1");
  }
  await page.locator('[data-view="reports"]').tap();
  await page.locator("#studentReport").tap();
  const dl = page.waitForEvent("download");
  await page.locator("#downloadReport").tap();
  const report = fs.readFileSync(await (await dl).path());
  await page.locator("#closeDialog").tap();
  await page.locator("#importReport").setInputFiles({
    name: "week.json",
    mimeType: "application/json",
    buffer: report,
  });
  await page.waitForFunction(() =>
    document.querySelector("#parentStatus").textContent.includes("已导入"),
  );
  await page.locator("#reportSubject").selectOption("biology");
  assert.match(await page.locator(".report-metrics").textContent(), /42 题/);
  await page.locator("#reportSubject").selectOption("geography");
  assert.match(await page.locator(".report-metrics").textContent(), /42 题/);
  await page.screenshot({
    path: "artifacts/academy/parent-subject-report.png",
    fullPage: true,
  });
  await page.waitForFunction(() =>
    document.querySelector("#offline").textContent.includes("离线已就绪"),
  );
  await context.setOffline(true);
  await page.reload();
  await page.locator('[data-view="collection"]').tap();
  assert.equal(
    await page.locator("[data-partner]:not([disabled])").count(),
    12,
  );
  for (const width of [375, 390, 768, 820, 1024, 1180]) {
    await page.setViewportSize({ width, height: 1024 });
    for (const view of ["home", "collection", "progress", "reports"]) {
      await page.locator(`[data-view="${view}"]`).tap();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        view + " " + width,
      );
    }
  }
  const migrationContext = await browser.newContext();
  const legacyPage = await migrationContext.newPage();
  await legacyPage.goto(base);
  await legacyPage.waitForSelector("#start");
  const oldSnapshot = await legacyPage.evaluate(async () => {
    const { db } = await import("./src/app.js");
    const { initial, begin, help } = await import("./src/storage/state.js");
    const { makeReport } = await import("./src/reports.js");
    const old = initial(),
      s = begin(old, 0, new Date("2026-10-30T06:00:00Z"));
    s.records[0].draft = [
      {
        erase: false,
        points: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
      },
    ];
    s.records[0].input = ["-"];
    help(
      old,
      { session: s.id, index: 0, question: s.questions[0].instanceId },
      3,
      true,
    );
    old.inventory.flowers = 2;
    old.clip.shots = ["gen", "kirby", "mario"];
    const report = makeReport(old);
    report.version = 1;
    report.records.forEach((r) => delete r.subject);
    const raw = JSON.stringify(report);
    localStorage.setItem("erin-parent-reports-v1", raw);
    await db.mutate((d) => {
      for (const key of Object.keys(d)) delete d[key];
      Object.assign(d, old);
    });
    return { old, raw };
  });
  await legacyPage.reload();
  await legacyPage.waitForSelector("#start");
  const migrated = await legacyPage.evaluate(async () => {
    const { db } = await import("./src/app.js");
    return db.state;
  });
  assert.equal(migrated.academy.unlocked.length, 3);
  assert.deepEqual(
    migrated.sessions[oldSnapshot.old.active].records,
    oldSnapshot.old.sessions[oldSnapshot.old.active].records,
  );
  assert.deepEqual(migrated.inventory, oldSnapshot.old.inventory);
  assert.deepEqual(migrated.clip, oldSnapshot.old.clip);
  assert.equal(
    await legacyPage.evaluate(() =>
      localStorage.getItem("erin-parent-reports-v1"),
    ),
    oldSnapshot.raw,
  );
  await legacyPage.click('[data-view="reports"]');
  assert.match(
    await legacyPage.locator(".report-metrics").textContent(),
    /1 题/,
  );
  await migrationContext.close();
  console.log(
    "PASS real IndexedDB migration: old draft/input/inventory/clips and v1 parent report preserved, three starter partners restored without deleting legacy evidence",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.ok(requests.every((u) => u.startsWith(new URL(base).origin)));
  await browser.close();
  console.log(
    "PASS v1.2: all 14 science base groups and bonuses (84 questions), touch guidance, partner locking, unlocks/stars, math keypad, subject reports, offline and phone/iPad views",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
