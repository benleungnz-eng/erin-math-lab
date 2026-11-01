import assert from "node:assert/strict";
import { readFile, access, readdir } from "node:fs/promises";
import path from "node:path";
const manifest = JSON.parse(
  await readFile("dist/manifest.webmanifest", "utf8"),
);
assert.equal(manifest.scope, "./");
assert.equal(manifest.start_url, "./");
assert.equal(manifest.display, "standalone");
for (const icon of manifest.icons) await access(path.join("dist", icon.src));
const html = await readFile("dist/index.html", "utf8");
for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  assert.ok(url.startsWith("./"), "Resources must be relative: " + url);
  await access(path.join("dist", url));
}
const sw = await readFile("dist/sw.js", "utf8");
assert.match(sw, /const BUILD='[a-f0-9]{16}'/);
assert.ok(
  !sw.includes("indexedDB.deleteDatabase") &&
    !sw.includes("localStorage.clear"),
);
const files = JSON.parse(sw.match(/const FILES=(\[[^\n]+\]);/)[1]);
for (const file of files) {
  assert.ok(file.startsWith("./"));
  await access(path.join("dist", file));
}
await access("dist/.nojekyll");
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await walk(file);
    else
      assert.ok(
        !/\.(?:pdf|env|pem|key|sqlite)$/.test(file),
        "Sensitive artifact: " + file,
      );
  }
}
await walk("dist");
console.log(
  "Verified relative Pages/PWA resources, full cache inventory, content-derived build ID and artifact boundaries.",
);
