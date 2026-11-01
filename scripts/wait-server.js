const url = process.env.TEST_URL || "http://127.0.0.1:4180/";
let ready = false;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1000) });
    if (r.ok && (await r.text()).includes("Erin Math Lab")) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!ready) throw Error("Production server did not become ready");
