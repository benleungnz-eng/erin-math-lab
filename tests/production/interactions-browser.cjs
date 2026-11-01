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
  assert.equal(await page.locator(".partner-mystery").count(), 10);
  assert.equal(
    await page
      .locator("[data-view=world],[data-view=studio],#homeBuild,#studioLink")
      .count(),
    0,
  );
  await shot("home-three-starters-mystery");
  assert.equal(await page.locator(".home-partner #bounceHome").count(), 1);
  const idleSource = await page
    .locator("#partnerStage .partner-raster")
    .getAttribute("src");
  assert.ok(idleSource.endsWith("/idle_default.webp"));
  await page.locator("#bounceHome").tap();
  await get();
  await page.waitForFunction(() =>
    /\/greet(?:-v2)?\.webp$/.test(
      document
        .querySelector("#partnerStage .partner-raster")
        .getAttribute("src"),
    ),
  );
  assert.notEqual(
    await page.locator("#partnerStage .partner-raster").getAttribute("src"),
    idleSource,
  );
  await page
    .locator("#partnerStage .partner-raster")
    .evaluate((i) => i.decode());
  const greetingOne = await page
    .locator("#partnerStage .partner-raster")
    .getAttribute("src");
  await page.locator("#bounceHome").tap();
  await get();
  await page.waitForFunction(
    (previous) =>
      document
        .querySelector("#partnerStage .partner-raster")
        .getAttribute("src") !== previous,
    greetingOne,
  );
  await page
    .locator("#partnerStage .partner-raster")
    .evaluate((i) => i.decode());
  assert.equal(
    await page
      .locator("#partnerStage .partner-art")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await shot("welcome-pose-under-hero");
  assert.ok(
    await page.locator("#partnerStage").evaluate((e) => {
      const r = e.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    }),
  );
  await page.locator('[data-view="collection"]').click();
  await page
    .locator(".state-gallery img")
    .first()
    .waitFor({ state: "attached" });
  assert.equal(await page.locator(".state-gallery img").count(), 20);
  assert.equal(
    await page.locator('.state-gallery img[src$="-v2.webp"]').count(),
    10,
  );
  await page.locator("#backHome").click();
  await page.locator("#startBiology").tap();
  await page.waitForSelector("[data-science-choice]");
  const tapSvg = async (x, y) => {
    await page.locator(".science-diagram svg").scrollIntoViewIfNeeded();
    const b = await page.locator(".science-diagram svg").boundingBox();
    await page.touchscreen.tap(
      b.x + (x * b.width) / 640,
      b.y + (y * b.height) / 310,
    );
    await get();
  };
  await tapSvg(95, 140);
  assert.match(await page.locator(".diagram-caption").innerText(), /豆苗/);
  const imageSizes = await page.evaluate(async () => {
    const sizes = [];
    for (const node of document.querySelectorAll(".observation-illustration")) {
      const image = new Image();
      image.src = node.getAttribute("href");
      await image.decode();
      const c = document.createElement("canvas");
      c.width = c.height = 320;
      const x = c.getContext("2d");
      x.drawImage(image, 0, 0, 320, 320);
      const data = x.getImageData(0, 0, 320, 320).data;
      let minX = 320,
        minY = 320,
        maxX = 0,
        maxY = 0;
      for (let y = 0; y < 320; y++)
        for (let z = 0; z < 320; z++)
          if (data[(y * 320 + z) * 4 + 3] > 100) {
            minX = Math.min(minX, z);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, z);
            maxY = Math.max(maxY, y);
          }
      sizes.push({
        id: node.dataset.object,
        width: ((maxX - minX) / 320) * 112,
        height: ((maxY - minY) / 320) * 112,
      });
    }
    return sizes;
  });
  assert.equal(imageSizes.length, 4);
  for (const size of imageSizes) {
    assert.ok(size.width >= 48 && size.height >= 48, JSON.stringify(size));
  }
  for (const id of ["plant", "snail", "rock", "car"]) {
    await page.locator(`button[data-region=${id}]`).tap();
    await get();
    assert.doesNotMatch(
      await page.locator(".diagram-caption").innerText(),
      /属于生物|不属于生物/,
    );
  }
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
  await page.waitForFunction(() =>
    document
      .querySelector(".diagram-caption")
      .textContent.includes("光是外界刺激"),
  );
  assert.match(
    await page.locator(".diagram-caption").innerText(),
    /光是外界刺激/,
  );
  assert.notEqual(
    await page.locator(".science-diagram svg").innerHTML(),
    before,
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".sunflower-illustration").dataset.stage === "2",
  );
  const rightPlant = await page
    .locator(".sunflower-illustration")
    .getAttribute("href");
  assert.ok(rightPlant.endsWith("sunflower-2.webp"));
  await page.locator("[data-plant=grow]").tap();
  assert.equal(
    await page.locator(".sunflower-illustration").getAttribute("data-stage"),
    "0",
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".sunflower-illustration").dataset.stage === "2",
  );
  await page.locator("[data-plant=side]").tap();
  assert.equal(
    await page
      .locator(".sunflower-illustration")
      .getAttribute("data-light-side"),
    "left",
  );
  await page.locator("[data-plant=grow]").tap();
  assert.match(
    await page.locator(".sunflower-illustration").getAttribute("transform"),
    /scale\(-1 1\)/,
  );
  await page.locator("[data-plant=reset]").tap();
  assert.equal(
    await page.locator(".sunflower-illustration").getAttribute("data-stage"),
    "0",
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
      for (const s of poses.flatMap((s) => [s, s + "-v2"])) {
        const i = new Image();
        i.src = `./public/assets/partners/${p.id}/${s}.webp`;
        await i.decode();
        if (i.naturalWidth !== 320) throw Error(p.id + s);
      }
    return partners.length * poses.length * 2;
  });
  assert.equal(loaded, 260);
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
    "PASS 3 starter mystery roster, removed extras, direct touch hotspots, live light stimulus, relevant guide, four cities, real-time Sun/latitude/longitude drags, day/night spin, 260 decoded poses and offline globe",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
