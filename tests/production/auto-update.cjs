const { chromium } = require("playwright");
const fs = require("node:fs");
const http = require("node:http");
const assert = require("node:assert/strict");
(async () => {
  let version = 1,
    fail = false;
  const worker = fs.readFileSync("dist/sw.js", "utf8");
  const pageHTML = `<html><body><div id="offline"></div><button id="cacheRetry" hidden></button><button id="update" hidden></button><div id="homeUpdateStatus"></div><button id="home">Home</button><button id="learn">Learn</button><script type="module">import {startPWA} from './pwa.js';let active=false;window.setActive=x=>active=x;document.querySelector('#home').onclick=()=>{active=false;document.dispatchEvent(new Event('erin:update-guide-opened'))};document.querySelector('#learn').onclick=()=>active=true;startPWA(()=>{},()=>active,async()=>{localStorage.setItem('saved','yes')},()=>!active);</script></body></html>`;
  const server = http.createServer((req, res) => {
    const p = new URL(req.url, "http://local").pathname;
    res.setHeader("Cache-Control", "no-store");
    if (p.endsWith("sw.js")) {
      res.setHeader("Content-Type", "text/javascript");
      res.end(
        worker
          .replace(/const VERSION=.*?;/, `const VERSION='test-${version}';`)
          .replace(/const BUILD=.*?;/, `const BUILD='${version}';`)
          .replace(
            /const FILES=.*?;/,
            'const FILES=["./index.html","./pwa.js","./asset.txt"];',
          ),
      );
    } else if (p.endsWith("pwa.js")) {
      res.setHeader("Content-Type", "text/javascript");
      res.end(fs.readFileSync("src/pwa.js"));
    } else if (p.endsWith("asset.txt")) {
      res.writeHead(fail ? 503 : 200).end("asset");
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end(pageHTML);
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = "http://127.0.0.1:" + server.address().port + "/station/";
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    headless: true,
  });
  try {
    const context = await browser.newContext();
    const p = await context.newPage();
    let nav = 0;
    p.on("framenavigated", (f) => {
      if (f === p.mainFrame()) nav++;
    });
    await p.goto(url);
    await p.waitForFunction(() => navigator.serviceWorker.controller);
    assert.equal(nav, 1, "first install does not reload");
    await p.evaluate(() => localStorage.setItem("record", "keep"));
    const update = async () =>
      p.evaluate(async () => {
        await (await navigator.serviceWorker.getRegistration()).update();
      });
    version = 2;
    await update();
    await p.waitForFunction(
      () =>
        navigator.serviceWorker.controller.scriptURL &&
        localStorage.getItem("saved") === "yes" &&
        document
          .querySelector("#homeUpdateStatus")
          .textContent.includes("检查"),
    );
    await p.waitForFunction(
      async () => !(await navigator.serviceWorker.getRegistration()).waiting,
    );
    await p.waitForTimeout(400);
    assert.equal(nav, 2, "home update reloads exactly once");
    assert.equal(
      await p.evaluate(() => localStorage.getItem("record")),
      "keep",
    );
    console.log("PASS automatic home update, one reload, records preserved");
    await p.click("#learn");
    version = 3;
    await update();
    await p.waitForFunction(async () =>
      Boolean((await navigator.serviceWorker.getRegistration()).waiting),
    );
    assert.equal(nav, 2);
    await Promise.all([p.waitForEvent("framenavigated"), p.click("#home")]);
    await p.waitForLoadState("load");
    assert.equal(nav, 3);
    console.log("PASS active lesson deferred until home");
    const other = await context.newPage();
    await other.goto(url);
    await other.waitForFunction(() => navigator.serviceWorker.controller);
    await other.click("#learn");
    version = 4;
    await update();
    await p.waitForFunction(async () =>
      Boolean((await navigator.serviceWorker.getRegistration()).waiting),
    );
    await p.waitForTimeout(500);
    assert.equal(nav, 3);
    await other.close();
    await Promise.all([p.waitForEvent("framenavigated"), p.click("#home")]);
    await p.waitForLoadState("load");
    assert.equal(nav, 4);
    console.log("PASS another tab learning blocks activation");
    fail = true;
    version = 5;
    await update();
    await p.waitForTimeout(600);
    assert.equal(nav, 4);
    assert.equal(
      await p.evaluate(() => localStorage.getItem("record")),
      "keep",
    );
    console.log("PASS failed install retains old working version");
    await context.setOffline(true);
    await p.reload();
    await p.waitForSelector("#home");
    assert.equal(
      await p.evaluate(() => localStorage.getItem("record")),
      "keep",
    );
    console.log("PASS offline reopening preserves progress");
    await context.close();
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
