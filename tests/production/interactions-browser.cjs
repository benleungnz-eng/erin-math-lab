const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    }),
    context = await browser.newContext({
      viewport: { width: 820, height: 1180 },
      hasTouch: true,
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.TEST_URL || "http://127.0.0.1:4180/",
    out = "artifacts/interactions";
  fs.mkdirSync(out, { recursive: true });
  const get = () =>
    page.evaluate(async () => {
      const { db } = await import("./src/app.js");
      await db.serial;
      return db.state;
    });
  const shot = async (n) =>
    page.screenshot({ path: out + "/" + n + ".png", fullPage: true });
  await page.goto(base);
  await page.waitForSelector("#start");
  assert.equal(await page.locator("[data-partner]:not([disabled])").count(), 3);
  assert.deepEqual(
    await page
      .locator("[data-partner]:not([disabled])")
      .evaluateAll((bs) => bs.map((b) => b.dataset.partner)),
    ["ling", "gu", "kirby"],
  );
  assert.equal(
    await page
      .locator("[data-partner][disabled] img,[data-partner][disabled] svg")
      .count(),
    0,
  );
  assert.equal(await page.locator(".partner-mystery").count(), 9);
  assert.equal(
    await page
      .locator("[data-view=world],[data-view=studio],#homeBuild,#studioLink")
      .count(),
    0,
  );
  await shot("home-three-starters-mystery");
  await page.locator("#bounceHome").tap();
  await get();
  assert.ok(
    await page.locator("#partnerStage").evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    }),
  );
  await page.locator("#startBiology").tap();
  await page.waitForSelector("[data-science-choice]");
  const tapSvg = async (x, y) => {
    const b = await page.locator(".science-diagram svg").boundingBox();
    await page.touchscreen.tap(
      b.x + (x * b.width) / 640,
      b.y + (y * b.height) / 310,
    );
    await get();
  };
  await tapSvg(95, 140);
  assert.match(await page.locator(".diagram-caption").innerText(), /豆苗/);
  await page.locator("button[data-region=car]").tap();
  await get();
  assert.equal(
    await page.locator(".region-highlight rect").getAttribute("x"),
    "480",
  );
  await shot("biology-car-correct-target");
  for (let i = 0; i < 2; i++) {
    const d = await get(),
      s = d.academy.science.sessions[d.academy.science.active.biology],
      q = s.questions[s.index];
    await page
      .locator("[data-science-choice]")
      .filter({ hasText: q.answer })
      .tap();
    await get();
    await page.locator("#scienceSubmit").tap();
    await page.waitForSelector("#scienceNext:not([hidden])");
    await page.locator("#scienceNext").tap();
    await get();
  }
  await page.locator("#scienceHint2").tap();
  await get();
  assert.match(await page.locator(".step").last().innerText(), /光照方向/);
  const before = await page.locator(".science-diagram svg").innerHTML();
  await tapSvg(525, 80);
  assert.match(
    await page.locator(".diagram-caption").innerText(),
    /光是外界刺激/,
  );
  assert.notEqual(
    await page.locator(".science-diagram svg").innerHTML(),
    before,
  );
  await page.locator("#checkScienceStep").tap();
  await get();
  assert.match(
    await page.locator("#scienceStepFeedback").innerText(),
    /已经看懂/,
  );
  await shot("biology-touch-light-response");
  await page.locator("[data-view=home]").tap();
  await page.locator("#startGeography").tap();
  await page.waitForSelector(".earth-canvas");
  for (const [id, text] of [
    ["guangzhou", "北半球 · 东半球"],
    ["beijing", "39.9°N"],
    ["shanghai", "31.2°N"],
    ["wellington", "南半球 · 西半球"],
  ]) {
    await page.locator(`[data-city=${id}]`).tap();
    assert.ok((await page.locator(".earth-place").innerText()).includes(text));
  }
  await page
    .locator(".earth-lab")
    .screenshot({ path: out + "/wellington-coordinates.png" });
  await page.locator("[data-earth=reset]").tap();
  const canvas = page.locator(".earth-canvas");
  await canvas.scrollIntoViewIfNeeded();
  let box = await canvas.boundingBox();
  const pos = (x, y) => ({
    x: box.x + (x * box.width) / 640,
    y: box.y + (y * box.height) / 430,
  });
  const p = pos(138, 207),
    a = pos(300, 35),
    b = pos(500, 180);
  const initial = await canvas.evaluate((c) => c.toDataURL());
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(a.x, a.y, { steps: 8 });
  const mid = await canvas.evaluate((c) => c.toDataURL());
  assert.notEqual(mid, initial, "sun updates actual canvas while pointer held");
  await page.mouse.move(b.x, b.y, { steps: 8 });
  assert.notEqual(await canvas.evaluate((c) => c.toDataURL()), mid);
  await page.mouse.up();
  await get();
  await page
    .locator(".earth-lab")
    .screenshot({ path: out + "/sun-drag-realtime.png" });
  await page.locator("[data-earth=reset]").tap();
  await page.locator("[data-earth-mode=light]").tap();
  const phase = await canvas.getAttribute("data-phase");
  await page.locator("[data-earth=step]").tap();
  assert.notEqual(await canvas.getAttribute("data-phase"), phase);
  assert.equal(await canvas.getAttribute("data-lon"), "113.28");
  await page.locator("[data-earth-mode=coordinates]").tap();
  await page.locator("[data-earth-drag=latitude]").tap();
  await canvas.scrollIntoViewIfNeeded();
  box = await canvas.boundingBox();
  const cd = await context.newCDPSession(page),
    start = pos(320, 190),
    end = pos(320, 270);
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: start.x, y: start.y }],
  });
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: end.x, y: end.y }],
  });
  assert.ok(
    Number(await canvas.getAttribute("data-lat")) < 0,
    "touch drag changes latitude before release",
  );
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await get();
  await page.locator("[data-earth-drag=longitude]").tap();
  await page.waitForFunction(
    () =>
      document
        .querySelector("[data-earth-drag=longitude]")
        .getAttribute("aria-pressed") === "true",
    null,
    { timeout: 3000 },
  );
  await canvas.scrollIntoViewIfNeeded();
  box = await canvas.boundingBox();
  const l1 = pos(290, 207),
    l2 = pos(360, 207);
  await page.mouse.move(l1.x, l1.y);
  await page.mouse.down();
  const lon = await canvas.getAttribute("data-lon");
  await page.mouse.move(l2.x, l2.y, { steps: 6 });
  assert.notEqual(await canvas.getAttribute("data-lon"), lon);
  await page.mouse.up();
  await get();
  for (const width of [375, 820, 1180]) {
    await page.setViewportSize({ width, height: 1180 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.locator("[data-city=guangzhou]").tap();
  await page
    .locator(".earth-lab")
    .screenshot({ path: out + "/guangzhou-latitude-longitude.png" });
  const loaded = await page.evaluate(async () => {
    const { partners } = await import("./src/partners.js");
    const poses = [
      "idle_default",
      "greet",
      "thinking",
      "hint_light",
      "hint_step",
      "correct_small",
      "correct_big",
      "wrong_soft",
      "wrong_retry",
      "complete",
    ];
    for (const p of partners)
      for (const s of poses) {
        const i = new Image();
        i.src = `./public/assets/partners/${p.id}/${s}.webp`;
        await i.decode();
        if (i.naturalWidth !== 320) throw Error(p.id + s);
      }
    return 120;
  });
  assert.equal(loaded, 120);
  await page.waitForFunction(() =>
    document.querySelector("#offline").textContent.includes("离线已就绪"),
  );
  await context.setOffline(true);
  await page.reload();
  await page.locator("#startGeography").tap();
  await page.waitForSelector(".earth-canvas");
  await page.locator("[data-city=wellington]").tap();
  assert.match(
    await page.locator(".earth-place").innerText(),
    /南半球 · 西半球/,
  );
  await shot("offline-interactive-globe");
  await context.setOffline(false);
  // Real IndexedDB migration of an existing eight-partner roster, with recovery.
  const beforeReset = await page.evaluate(async () => {
    const { db } = await import("./src/app.js");
    const { partners } = await import("./src/partners.js");
    await db.mutate((d) => {
      d.academy.unlocked = partners.slice(0, 8).map((p) => p.id);
      d.academy.selected = "lu";
      delete d.academy.rosterVersion;
    });
    return db.state;
  });
  await page.reload();
  await page.waitForSelector("#start");
  const afterReset = await get();
  assert.deepEqual(afterReset.academy.unlocked, ["ling", "gu", "kirby"]);
  assert.deepEqual(afterReset.academy.science, beforeReset.academy.science);
  assert.deepEqual(afterReset.sessions, beforeReset.sessions);
  assert.deepEqual(afterReset.inventory, beforeReset.inventory);
  const recovery = await page.evaluate(async () => {
    const { db } = await import("./src/app.js");
    return db.recovery();
  });
  assert.deepEqual(recovery.academy.unlocked, beforeReset.academy.unlocked);
  await page.reload();
  await page.waitForSelector("#start");
  assert.deepEqual((await get()).academy.unlocked, ["ling", "gu", "kirby"]);
  await shot("migrated-eight-to-three");
  await page.locator("[data-view=settings]").tap();
  assert.equal(await page.locator("#partnerSound").isDisabled(), true);
  assert.match(await page.locator("main").innerText(), /原声素材尚未安装/);
  assert.deepEqual(errors, []);
  await context.close();
  await browser.close();
  console.log(
    "PASS 3 starter mystery roster, removed extras, direct touch hotspots, live light stimulus, relevant guide, four cities, real-time Sun/latitude/longitude drags, day/night spin, 120 decoded poses and offline globe",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
