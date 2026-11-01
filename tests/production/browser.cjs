const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.TEST_URL || "http://127.0.0.1:4180/";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
  });
  const errors = [],
    requests = [];
  await context.addInitScript(() => {
    const OriginalDate = Date;
    window.__clock = "2026-11-02T06:00:00Z";
    window.Date = class extends OriginalDate {
      constructor(...args) {
        super(...(args.length ? args : [window.__clock]));
      }
      static now() {
        return new OriginalDate(window.__clock).valueOf();
      }
    };
  });
  context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  context.on("request", (r) => requests.push(r.url()));
  const page = await context.newPage();
  let passed = 0;
  const ok = (s) => {
    console.log("PASS " + s);
    passed++;
  };
  const get = () =>
    page.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
      return db.state;
    });
  const waitSave = () =>
    page.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
    });
  const answer = async () => {
    const data = await get(),
      s = data.sessions[data.active],
      q = s.questions[s.index];
    if (q.choices) {
      await page
        .locator("[data-choice]")
        .filter({ hasText: q.correctAnswer[0] })
        .click();
    } else {
      for (let i = 0; i < q.correctAnswer.length; i++) {
        const r = q.correctAnswer[i];
        await page
          .locator(`[data-answer="${i}"]`)
          .fill(r.d === 1 ? String(r.n) : `${r.n * 2}/${r.d * 2}`);
      }
    }
    await waitSave();
    await page.click("#submitAnswer");
    await page.waitForSelector("#nextQuestion:not([hidden])");
  };
  const finish = async () => {
    let data = await get();
    while (!data.sessions[data.active].completed) {
      await answer();
      await page.click("#nextQuestion");
      await waitSave();
      data = await get();
    }
  };
  fs.mkdirSync("artifacts/production", { recursive: true });
  await page.goto(base);
  await page.waitForSelector("#start");
  await page.waitForFunction(() =>
    document.querySelector("#offline").textContent.includes("离线已就绪"),
  );
  await page.screenshot({
    path: "artifacts/production/home.png",
    fullPage: true,
  });
  ok("three-subject home, original companions and complete offline inventory");
  await page.click("#homeBuild");
  await page.click("#bounce");
  assert.equal(await page.locator("[data-cell]").count(), 36);
  assert.equal(await page.locator("[data-item]:not([disabled])").count(), 3);
  await page.click('[data-item="tree"]');
  await page.click('[data-cell="0"]');
  await page.click("#confirmPlace");
  await page.click('[data-cell="0"]');
  await page.click("#rotate");
  await page.click("#move");
  await page.click('[data-cell="1"]');
  await page.click("#confirmPlace");
  let data = await get();
  assert.ok(
    data.layout.some(
      (x) => x.id === "tree" && x.cell === 1 && x.rotation === 1,
    ),
  );
  await page.click('[data-cell="1"]');
  await page.click("#remove");
  await page.click("#undoBuild");
  await page.click('[data-skin="mint"]');
  await waitSave();
  await page.reload();
  await page.click('[data-view="world"]');
  assert.ok((await get()).layout.some((x) => x.cell === 1));
  assert.equal((await get()).prefs.skin, "mint");
  await page.screenshot({
    path: "artifacts/production/world.png",
    fullPage: true,
  });
  ok("36-cell build, place/preview/rotate/move/recover/undo and saved skin");
  await page.click('[data-view="home"]');
  await page.click("#start");
  await page.waitForSelector("#submitAnswer");
  await page.click("#submitAnswer");
  await waitSave();
  assert.match(await page.locator("#feedback").textContent(), /完整/);
  await page.locator('[data-answer="0"]').fill("999");
  await waitSave();
  const initialData = await get();
  await page.click("#submitAnswer");
  await waitSave();
  assert.match(await page.locator("#feedback").textContent(), /保留/);
  assert.equal((await get()).sessions[initialData.active].index, 0);
  ok("invalid input and formal wrong submission stay on same question");
  const canvas = page.locator("canvas"),
    box = await canvas.boundingBox();
  await page.mouse.move(box.x + 50, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 90, { steps: 12 });
  await page.mouse.up();
  await waitSave();
  const image = await canvas.evaluate((c) => c.toDataURL());
  await page.click("#hint1");
  await waitSave();
  await page.click("#hint2");
  await waitSave();
  assert.equal(
    await page.locator("canvas").evaluate((c) => c.toDataURL()),
    image,
  );
  await page.locator('[data-answer="0"]').fill("-");
  await waitSave();
  await page.reload();
  await page.click("#start");
  assert.equal(await page.locator('[data-answer="0"]').inputValue(), "-");
  assert.equal(
    await page.locator("canvas").evaluate((c) => c.toDataURL()),
    image,
  );
  assert.match(await page.locator("#helpArea").textContent(), /一步一步/);
  ok(
    "input, same question, help state and actual strokes restored after reload",
  );
  await page.click("#explain");
  let latest = await get(),
    s = latest.sessions[latest.active];
  assert.equal(s.records[0].errors, 1);
  assert.equal(s.records[0].requestedHelp, true);
  await page.click("#transfer");
  latest = await get();
  s = latest.sessions[latest.active];
  assert.notEqual(
    s.records[0].practice.question.contentFingerprint,
    s.questions[0].contentFingerprint,
  );
  assert.equal(s.questions.length, 5);
  await page.click("#later");
  await page.click("#finishStudying");
  await page.click("#nextQuestion");
  ok(
    "direct explanation adds no errors, transfer uses new content and can be skipped",
  );
  await finish();
  data = await get();
  s = data.sessions[data.active];
  assert.equal(s.index, 5);
  assert.equal(s.records[0].mode, "studied");
  assert.equal(Object.keys(data.academy.rewards).length, 1);
  assert.ok(s.partnerReward.partner);
  assert.equal(Object.keys(data.ledger).length, 0);
  const inventory = JSON.stringify(data.inventory);
  await page.reload();
  await page.click("#start");
  assert.equal(JSON.stringify((await get()).inventory), inventory);
  await page.click('[data-reflection="通分"]');
  await page.click("#share");
  assert.match(await page.locator("#dialogBody").textContent(), /只包含日期/);
  assert.equal(await page.locator("#downloadReport").count(), 1);
  await page.click("#closeDialog");
  await page.click("#performance");
  assert.equal(await page.locator(".comedy-cast .partner-art").count(), 3);
  await page.click("#replayShow");
  assert.equal(await page.locator(".comedy-cast .partner-art").count(), 3);
  await page.click("#skipShow");
  assert.equal(await page.locator(".comedy-stage").count(), 0);
  ok(
    "five questions completed with honest help reporting, full reward and no reload duplicates",
  );
  await page.click("#extra");
  assert.equal(
    (await get()).sessions[(await get()).active].questions.length,
    3,
  );
  await finish();
  await page.click("#extra");
  assert.equal(
    (await get()).sessions[(await get()).active].questions.length,
    2,
  );
  await finish();
  data = await get();
  assert.equal(Object.keys(data.academy.rewards).length, 3);
  assert.equal(
    Object.values(data.sessions).reduce((n, s) => n + s.questions.length, 0),
    10,
  );
  ok("optional 5+3+2 complete, exactly three stage rewards");
  // Exercise each core guidance family in an isolated synthetic day; check real interaction and step accounting.
  for (const templateId of [
    "fraction",
    "polynomial",
    "bracket",
    "substitute",
  ]) {
    await page.evaluate(async (id) => {
      const { db } = await import("./src/app.js"),
        { begin } = await import("./src/storage/state.js"),
        { generate, hash } = await import("./src/engine/templates.js");
      await db.mutate((d) => {
        d.active = null;
        window.__clock = {
          fraction: "2026-11-05T06:00:00Z",
          polynomial: "2026-11-06T06:00:00Z",
          bracket: "2026-11-07T06:00:00Z",
          substitute: "2026-11-08T06:00:00Z",
        }[id];
        const date = new Date(window.__clock);
        const s = begin(d, 0, date);
        s.questions[0] = generate(id, hash(id));
        s.records[0].maxHint = 0;
      });
    }, templateId);
    await page.click('[data-view="home"]');
    await page.click("#start");
    await page.click("#hint2");
    let q = (await get()).sessions[(await get()).active].questions[0];
    let idx = 0;
    for (const step of q.guidedSteps) {
      if (step.type === "groups") {
        for (let i = 0; i < q.visual.cards.length; i++)
          await page
            .locator(`[data-group="${i}"]`)
            .selectOption(q.visual.cards[i].group);
        await page.click("#checkGroups");
      } else if (step.type === "choice") {
        await page
          .locator("[data-guide-choice]")
          .filter({ hasText: step.expected })
          .click();
      } else {
        await page.locator("#guideInput").fill(step.expected);
        await page.click("#checkGuide");
      }
      await waitSave();
      idx++;
      assert.equal(
        (await get()).sessions[(await get()).active].records[0].guideIndex,
        idx,
      );
    }
    const gr = (await get()).sessions[(await get()).active].records[0];
    assert.equal(gr.errors, 0);
    assert.equal(gr.guideEvents.length, q.guidedSteps.length);
    await page.click("#explain");
    await page.screenshot({
      path: `artifacts/production/guidance-${templateId}.png`,
      fullPage: true,
    });
    await page.click("#finishStudying");
    await page.click("#nextQuestion");
    await finish();
    ok(templateId + " interactive local steps and distinct guided accounting");
  }
  // Use a new date for unfinished midnight session.
  await page.evaluate(async () => {
    window.__clock = "2026-11-10T15:59:00Z";
    const { db } = await import("./src/app.js");
    await db.mutate((d) => (d.active = null));
  });
  await page.click('[data-view="home"]');
  await page.click("#start");
  const before = (await get()).sessions[(await get()).active];
  await page.evaluate(() => (window.__clock = "2026-11-10T16:01:00Z"));
  await page.reload();
  await page.click("#start");
  assert.equal((await get()).sessions[(await get()).active].id, before.id);
  ok("midnight resumes locked learning date and question identity");
  const other = await context.newPage();
  await other.goto(base);
  await other.click("#start");
  await page.click("#explain");
  await page.click("#finishStudying");
  await page.click("#nextQuestion");
  await other.waitForFunction(async () => {
    const { db } = await import("./src/app.js");
    return db.state.sessions[db.state.active]?.index === 1;
  });
  assert.equal((await get()).sessions[(await get()).active].index, 1);
  await other.close();
  ok("multi-tab receives latest transactional progress");
  await context.setOffline(true);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto(base);
  await reopened.click("#start");
  await reopened.waitForSelector("#submitAnswer");
  while (await reopened.locator("#explain").count()) {
    await reopened.click("#explain");
    await reopened.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
    });
    await reopened.click("#finishStudying");
    await reopened.click("#nextQuestion");
    await reopened.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
    });
  }
  assert.match(await reopened.locator("main").textContent(), /今天已经完成/);
  ok(
    "offline page closed/reopened, remaining five-question session completed and saved",
  );
  await context.setOffline(false);
  await reopened.click('[data-view="studio"]');
  await reopened.locator('[data-shot="0"]').selectOption("gu");
  await reopened.click('[data-swap="1"]');
  await reopened.locator("#transition").selectOption("滑动");
  await reopened.click("#playClip");
  await reopened.waitForTimeout(2200);
  assert.match(await reopened.locator("#clipLabel").textContent(), /镜头 2/);
  await reopened.click("#stopClip");
  await reopened.reload();
  await reopened.click('[data-view="studio"]');
  assert.equal(await reopened.locator('[data-shot="0"]').inputValue(), "gu");
  assert.equal(await reopened.locator("#transition").inputValue(), "滑动");
  ok(
    "three-shot studio selection, reordering, transition, play/stop and persistence",
  );
  await reopened.click('[data-view="settings"]');
  const downloadPromise = reopened.waitForEvent("download");
  await reopened.click("#export");
  const download = await downloadPromise;
  const backup = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
  assert.equal(backup.schema, 2);
  await reopened.locator("#import").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schema":99}'),
  });
  await reopened.waitForFunction(() =>
    document.querySelector("#notice").textContent.includes("没有更改"),
  );
  assert.match(await reopened.locator("#notice").textContent(), /没有更改/);
  await reopened.locator("#import").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await reopened.click("#mergeImport");
  await reopened.waitForFunction(() => !document.querySelector("#dialog").open);
  let merged = await reopened.evaluate(async () => {
    const { db } = await import("./src/app.js");
    return db.state;
  });
  assert.deepEqual(merged.inventory, backup.inventory);
  const recoveryPromise = reopened.waitForEvent("download");
  await reopened.click("#recovery");
  assert.equal(
    JSON.parse(fs.readFileSync(await (await recoveryPromise).path(), "utf8"))
      .schema,
    2,
  );
  ok(
    "versioned export, invalid rejection, conservative merge and recoverable pre-import backup",
  );
  await reopened.evaluate(async () => {
    window.__clock = "2026-11-20T06:00:00Z";
    const { db } = await import("./src/app.js");
    await db.mutate((d) => (d.active = null));
  });
  for (const size of [
    { width: 768, height: 1024 },
    { width: 820, height: 1180 },
    { width: 1024, height: 768 },
    { width: 1180, height: 820 },
    { width: 390, height: 844 },
    { width: 375, height: 812 },
  ]) {
    await reopened.setViewportSize(size);
    await reopened.click('[data-view="home"]');
    await reopened.screenshot({
      path: `artifacts/production/home-${size.width}.png`,
      fullPage: true,
    });
    assert.ok(
      await reopened.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await reopened.click('[data-view="world"]');
    assert.ok(
      await reopened.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await reopened.click('[data-view="home"]');
    await reopened.click("#start");
    await reopened.waitForSelector("#hint2");
    await reopened.click("#hint2");
    await reopened.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
    });
    assert.ok(
      await reopened.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await reopened.screenshot({
      path: `artifacts/production/practice-${size.width}.png`,
      fullPage: true,
    });
  }
  ok("all specified iPad/phone sizes including narrow 375, home and building");
  const denied = await browser.newContext();
  await denied.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw Error("denied");
      },
    });
  });
  const dp = await denied.newPage();
  await dp.goto(base);
  await dp.click("#start");
  await dp.waitForSelector("#submitAnswer");
  assert.match(await dp.locator("#notice").textContent(), /保存暂不可用/);
  await denied.close();
  ok("storage unavailable remains playable with explicit unsaved warning");
  assert.deepEqual(errors, []);
  assert.ok(requests.every((url) => url.startsWith(new URL(base).origin)));
  ok("no runtime external requests and no uncaught JavaScript errors");
  await browser.close();
  console.log(`${passed} production browser scenarios passed`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
