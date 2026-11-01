import { createHash } from "node:crypto";
import {
  mkdir,
  cp,
  copyFile,
  rm,
  readdir,
  writeFile,
  stat,
  readFile,
} from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const file of ["index.html", "production.css", "manifest.webmanifest"])
  await copyFile(file, `dist/${file}`);
await cp("src", "dist/src", { recursive: true });
await cp("public", "dist/public", { recursive: true });
await rm("dist/public/assets/station-original.png", { force: true });
async function walk(dir) {
  let result = [];
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const p = `${dir}/${file.name}`;
    result.push(...(file.isDirectory() ? await walk(p) : [p]));
  }
  return result;
}
const files = (await walk("dist")).map((x) => "./" + x.slice(5));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
const contentHash = createHash("sha256");
// Installer policy is part of the build identity, alongside runtime assets.
contentHash.update("fresh-http-cache-install-v2");
for (const file of [...files].sort()) {
  contentHash.update(file);
  contentHash.update(await readFile("dist/" + file.slice(2)));
}
const buildId = contentHash.digest("hex").slice(0, 16);
await writeFile("dist/.nojekyll", "");
const sw = `const VERSION='erin-production-v${pkg.version}';
const BUILD='${buildId}';
const scopeKey=encodeURIComponent(new URL(self.registration.scope).pathname);
const CACHE=VERSION+'-'+BUILD+'-'+scopeKey;
const FILES=${JSON.stringify(files)};
const urls=FILES.map(x=>new URL(x,self.registration.scope).href);
self.addEventListener('install',e=>e.waitUntil((async()=>{const cache=await caches.open(CACHE);await cache.addAll(urls.map(url=>new Request(url,{cache:"reload"})));})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{await self.clients.claim();})()));
self.addEventListener('message',e=>{if(e.data==='ACTIVATE')self.skipWaiting();if(e.data==='STATUS')e.waitUntil((async()=>{const cache=await caches.open(CACHE);const entries=await Promise.all(urls.map(u=>cache.match(u)));e.ports[0]?.postMessage({ready:entries.every(Boolean),version:VERSION});})());});
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;e.respondWith((async()=>{const c=await caches.open(CACHE);const hit=await c.match(e.request,{ignoreSearch:true});if(hit)return hit;if(e.request.mode==='navigate')return await c.match(new URL('./index.html',self.registration.scope).href)||fetch(e.request);return fetch(e.request);})());});
// Old caches are retained so an open old-version tab never loses its assets. No deletion of other apps' caches.
`;
await writeFile("dist/sw.js", sw);
let bytes = 0;
for (const f of await walk("dist")) bytes += (await stat(f)).size;
console.log(
  `Production build: ${files.length + 1} files, ${bytes} bytes. Static output dist/.`,
);
