const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const errors = [];
  const base = process.env.TEST_URL || "http://127.0.0.1:4180/";
  try {
    const context = await browser.newContext({
      viewport: { width: 820, height: 1180 },
      hasTouch: true,
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    const get = () =>
      page.evaluate(async () => {
        const { db } = await import("./src/app.js");
        await db.serial;
        return db.state;
      });
    await page.goto(base);
    await page.click("#startGeography");
    await page.waitForSelector("#openSolarDemo");
    await page.locator("[data-science-choice]").first().click();
    const before = await get();
    await page.click("#openSolarDemo");
    const frame =
      page.frames().find((f) => f.url().includes("/public/solar/")) ||
      (await new Promise((resolve) => page.once("framenavigated", resolve)));
    await frame.waitForSelector(
      '#space[data-map-ready="true"][data-renderer="WebGL"]',
    );
    assert.equal(await frame.locator(".city-tag").count(), 4);
    await frame.click('button[data-city="wellington"]');
    await frame.waitForFunction(() =>
      document.querySelector("#place").textContent.includes("南半球 · 西半球"),
    );
    await frame.waitForFunction(
      () => !document.querySelector('.city-tag[data-city="wellington"]').hidden,
    );
    assert.equal(
      await frame.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      true,
    );
    fs.mkdirSync("artifacts/solar", { recursive: true });
    await page.screenshot({ path: "artifacts/solar/ipad-wellington.png" });
    await frame.click('button[data-city="guangzhou"]');
    await frame.click('[data-mode="spin"]');
    const setTime = async (value) => {
      await frame.locator("#time").evaluate((e, v) => {
        e.value = v;
        e.dispatchEvent(new Event("input", { bubbles: true }));
      }, value);
      await frame.waitForFunction(
        (v) =>
          Math.abs(
            Number(document.querySelector("#space").dataset.spin) -
              (v / 24) * Math.PI * 2,
          ) < 0.001,
        value,
      );
    };
    await setTime(0);
    assert.equal(
      await frame.locator("#space").getAttribute("data-phase"),
      "白昼",
    );
    await setTime(12);
    assert.equal(
      await frame.locator("#space").getAttribute("data-phase"),
      "黑夜",
    );
    await frame.click('[data-mode="orbit"]');
    await frame.locator("#time").evaluate((e) => {
      e.value = 91;
      e.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await frame.waitForFunction(
      () => Number(document.querySelector("#space").dataset.day) > 90,
    );
    await frame.click("#back");
    await page.waitForSelector(".solar-dialog", { state: "detached" });
    const after = await get();
    const sid = before.academy.science.active.geography;
    assert.deepEqual(
      after.academy.science.sessions[sid].records[0].input,
      before.academy.science.sessions[sid].records[0].input,
    );
    assert.deepEqual(
      after.academy.science.sessions[sid].questions,
      before.academy.science.sessions[sid].questions,
    );
    assert.equal(
      after.academy.science.sessions[sid].index,
      before.academy.science.sessions[sid].index,
    );
    console.log(
      "PASS independent 3D page, accurate four-city labels, day/night, orbit, and preserved answer on return",
    );
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1180, height: 820 },
    ]) {
      await page.setViewportSize(viewport);
      await page.click("#openSolarDemo");
      const child = await (
        await page.locator(".solar-dialog iframe").elementHandle()
      ).contentFrame();
      await child.waitForSelector(
        '#space[data-map-ready="true"][data-renderer="WebGL"]',
      );
      assert.equal(
        await child.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        true,
      );
      assert.ok((await child.locator("#space").boundingBox()).height >= 120);
      await child.click('button[data-city="guangzhou"]');
      await page.screenshot({
        path: `artifacts/solar/${viewport.width}-city.png`,
      });
      await child.click("#back");
      await page.waitForSelector(".solar-dialog", { state: "detached" });
    }
    console.log(
      "PASS phone, portrait iPad and landscape layout; close/reopen releases the embedded scene",
    );
    assert.deepEqual(errors, []);
    await context.close();
    // A fresh offline-capable context must cache the entire independent page and engine.
    const offline = await browser.newContext({
      viewport: { width: 820, height: 1180 },
    });
    const op = await offline.newPage();
    await op.goto(base);
    await op.waitForFunction(
      () =>
        document.querySelector("#offline").textContent.includes("离线已就绪"),
      null,
      { timeout: 60000 },
    );
    await op.reload();
    await op.waitForSelector("#startGeography");
    await offline.setOffline(true);
    await op.click("#startGeography");
    await op.click("#openSolarDemo");
    const child = await (
      await op.locator(".solar-dialog iframe").elementHandle()
    ).contentFrame();
    await child.waitForSelector(
      '#space[data-map-ready="true"][data-renderer="WebGL"]',
    );
    await child.click('button[data-city="wellington"]');
    await child.waitForFunction(() =>
      document.querySelector("#place").textContent.includes("惠灵顿"),
    );
    console.log(
      "PASS complete 3D demonstration and map reopen without network",
    );
    await offline.close();
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
