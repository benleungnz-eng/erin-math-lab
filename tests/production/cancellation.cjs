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
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:4180/");
  await page.waitForSelector("#start");
  await page.evaluate(async () => {
    const { db } = await import("./src/app.js");
    const { initial, begin } = await import("./src/storage/state.js");
    const { generate } = await import("./src/engine/templates.js");
    await db.mutate((d) => {
      Object.assign(d, initial());
      const s = begin(d, 0, new Date("2026-11-01T06:00:00Z"));
      s.questions[0] = generate("bracket", 689);
      d.seen[s.questions[0].contentFingerprint] = true;
    });
  });
  await page.click("#start");
  await page.waitForSelector("#answerInstructions");
  assert.match(
    await page.locator("#answerInstructions").textContent(),
    /没有 x 项时，系数填 0/,
  );
  assert.equal(
    await page.locator(".simplified-result").count(),
    0,
    "no pre-answer reveal",
  );
  const colors = await page
    .locator("#submitAnswer,#hint1,#hint2,#explain")
    .evaluateAll((nodes) =>
      nodes.map((e) => getComputedStyle(e).backgroundColor),
    );
  assert.ok(new Set(colors).size >= 3, "functional buttons differ");
  fs.mkdirSync("artifacts/cancellation", { recursive: true });
  await page.screenshot({
    path: "artifacts/cancellation/question-ipad.png",
    fullPage: true,
  });
  await page.click("#explain");
  await page.waitForSelector(".hint-section");
  assert.match(await page.locator("#helpArea").textContent(), /化简结果：6/);
  assert.match(
    await page.locator("#helpArea").textContent(),
    /没有 x 项，系数就是 0/,
  );
  assert.ok(
    !(await page.locator("#helpArea").textContent()).includes("(0)x + 6"),
  );
  await page.screenshot({
    path: "artifacts/cancellation/explanation-ipad.png",
    fullPage: true,
  });
  await page.locator('[data-answer="0"]').fill("0");
  await page.locator('[data-answer="1"]').fill("6");
  await page.evaluate(async () => {
    const { db } = await import("./src/app.js");
    await db.serial;
  });
  await page.click("#submitAnswer");
  await page.waitForSelector(".simplified-result");
  assert.match(await page.locator("#feedback").textContent(), /答对了/);
  assert.match(
    await page.locator(".simplified-result").textContent(),
    /化简结果：6/,
  );
  await page.reload();
  await page.click("#start");
  await page.waitForSelector(".simplified-result");
  assert.equal(await page.locator('[data-answer="0"]').inputValue(), "0");
  assert.equal(await page.locator('[data-answer="1"]').inputValue(), "6");
  assert.equal(await page.locator(".correct-celebration").count(), 0);
  const data = await page.evaluate(async () => {
    const { db } = await import("./src/app.js");
    const { validate } = await import("./src/storage/state.js");
    return validate(db.state);
  });
  assert.equal(data.sessions[data.active].records[0].mode, "helped");
  for (const width of [375, 390, 768, 820]) {
    await page.setViewportSize({ width, height: 1180 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  await browser.close();
  console.log(
    "PASS reported cancellation: guidance, 0/6 answer, simplified 6, old-record validation, refresh and functional buttons at phone/iPad sizes",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
