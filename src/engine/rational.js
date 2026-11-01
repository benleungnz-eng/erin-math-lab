export function rational(n, d = 1) {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
    throw Error("分数超出范围");
  if (d < 0) {
    n = -n;
    d = -d;
  }
  let a = Math.abs(n),
    b = d;
  while (b) {
    [a, b] = [b, a % b];
  }
  return { n: n / a, d: d / a };
}
export const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
export const mul = (a, b) => rational(a.n * b.n, a.d * b.d);
export function div(a, b) {
  if (!b.n) throw Error("不能除以 0");
  return rational(a.n * b.d, a.d * b.n);
}
export const show = (a) => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);
export const equal = (a, b) => a?.n === b?.n && a?.d === b?.d;
export function normalize(value) {
  return String(value ?? "")
    .replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 65296))
    .replace(/[−﹣－]/g, "-")
    .replace(/[＋]/g, "+")
    .replace(/[．。]/g, ".")
    .replace(/[／]/g, "/")
    .replace(/\s/g, "");
}
export function parse(value) {
  const s = normalize(value);
  if (s.length > 30) return null;
  const parts = s.split("/");
  if (parts.length > 2) return null;
  const decimal = (t) => {
    if (!/^[+-]?(?:\d{1,6}(?:\.\d{1,6})?|\.\d{1,6})$/.test(t)) return null;
    const digits = t.split(".")[1]?.length || 0;
    return rational(Number(t.replace(".", "")), 10 ** digits);
  };
  try {
    const n = decimal(parts[0]);
    if (!n) return null;
    if (parts.length === 1) return n;
    const d = decimal(parts[1]);
    return d?.n ? div(n, d) : null;
  } catch {
    return null;
  }
}
