import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
test("same-version asset changes create a distinct worker/cache without changing data storage", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "erin-build-"));
  try {
    await mkdir(path.join(root, "src"));
    await mkdir(path.join(root, "public"));
    for (const [file, value] of Object.entries({
      "index.html": "<title>test</title>",
      "production.css": "body{}",
      "manifest.webmanifest": "{}",
      "package.json": '{"version":"1.0.1"}',
      "src/example.js": "export const answer=1;",
    }))
      await writeFile(path.join(root, file), value);
    const build = () =>
      execFileSync(process.execPath, [path.resolve("scripts/build.js")], {
        cwd: root,
      });
    build();
    const first = await readFile(path.join(root, "dist/sw.js"), "utf8");
    build();
    assert.equal(await readFile(path.join(root, "dist/sw.js"), "utf8"), first);
    await writeFile(
      path.join(root, "src/example.js"),
      "export const answer=2;",
    );
    build();
    const second = await readFile(path.join(root, "dist/sw.js"), "utf8");
    assert.notEqual(second, first);
    assert.notEqual(
      second.match(/const BUILD='([^']+)'/)[1],
      first.match(/const BUILD='([^']+)'/)[1],
    );
    assert.ok(
      !second.includes("deleteDatabase") &&
        !second.includes("localStorage.clear"),
    );
    await readFile(path.join(root, "dist/.nojekyll"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
