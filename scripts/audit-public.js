import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const forbidden =
  /(?:^|\/)(?:\.env(?:\..*)?|id_rsa|credentials|backups|student-records)(?:\/|$)|\.(?:pdf|pem|key|sqlite|p12)$/i;
const secrets = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bsk-[a-zA-Z0-9]{32,}\b/,
];
let count = 0;
const failures = [];
for (const file of files) {
  if (forbidden.test(file)) failures.push(file + ": forbidden file path");
  if (/\.(?:png|webp|jpg|zip)$/.test(file)) continue;
  let text;
  try {
    text = await readFile(file, "utf8");
  } catch {
    continue;
  }
  count++;
  for (const pattern of secrets)
    if (pattern.test(text))
      failures.push(file + ": credential pattern detected");
  if (
    file !== "scripts/audit-public.js" &&
    /libfile_[a-z0-9]+|account_id=personal|[A-Za-z0-9._%+-]+@(?:gmail|outlook|hotmail)\.com|Erin\s+在广州读/.test(
      text,
    )
  )
    failures.push(file + ": personal/source-material reference");
}
if (failures.length) throw Error(failures.join("\n"));
console.log(
  `Public source audit passed for ${count} text files; no credential patterns, private documents or student-record files detected. Git author metadata and repository settings require separate review.`,
);
