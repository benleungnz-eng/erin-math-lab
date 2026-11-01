import { mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
await mkdir("artifacts", { recursive: true });
await rm("artifacts/erin-math-lab-v1.0.1.zip", { force: true });
execFileSync("zip", ["-qr", "../artifacts/erin-math-lab-v1.0.1.zip", "."], {
  cwd: "dist",
});
console.log("Optional deploy snapshot: artifacts/erin-math-lab-v1.0.1.zip");
