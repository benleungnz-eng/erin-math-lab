export const TILT = 23.44;
export const YEAR = 365.25;
export const MONTH = 27.32;
export const radians = (degrees) => (degrees * Math.PI) / 180;
// Equirectangular texture: u=0 at 180 W, u=.5 at Greenwich.
// Three.js SphereGeometry puts u=0 at -X and increasing longitude towards -Z.
export function surfacePoint(lat, lon, spin = 0, tilt = TILT, radius = 0.81) {
  const a = radians(lon) + spin,
    p = radians(lat),
    t = radians(-tilt);
  const x = Math.cos(p) * Math.cos(a),
    y = Math.sin(p),
    z = -Math.cos(p) * Math.sin(a);
  return [
    radius * (x * Math.cos(t) - y * Math.sin(t)),
    radius * (x * Math.sin(t) + y * Math.cos(t)),
    radius * z,
  ];
}
export function earthPosition(day, radius = 8) {
  const a = Math.PI / 2 + (day / YEAR) * Math.PI * 2;
  return [radius * Math.cos(a), 0, radius * Math.sin(a)];
}
export function solarFocus(target) {
  return ["equator", "longitude", "latitude"].includes(target)
    ? "coordinates"
    : target === "orbit"
      ? "orbit"
      : "spin";
}
export function daylight(point, earth) {
  const len = Math.hypot(...point) * Math.hypot(...earth);
  return (
    -(point[0] * earth[0] + point[1] * earth[1] + point[2] * earth[2]) / len
  );
}
