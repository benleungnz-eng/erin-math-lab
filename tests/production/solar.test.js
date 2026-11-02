import test from "node:test";
import assert from "node:assert/strict";
import {
  surfacePoint,
  earthPosition,
  daylight,
  solarFocus,
  YEAR,
  TILT,
} from "../../src/solar-model.js";
import { cities } from "../../src/earth-lab.js";
import { supportsSolarDemo } from "../../src/solar-demo.js";
import { scienceQuestions } from "../../src/content/science.js";
const close = (a, b, tolerance = 1e-9) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`);
test("surface coordinates align with equirectangular map, preserve exact city positions and rotate eastwards", () => {
  assert.deepEqual(surfacePoint(0, 0, 0, 0, 1), [1, 0, -0]);
  const east = surfacePoint(0, 90, 0, 0, 1);
  close(east[0], 0);
  close(east[2], -1);
  for (const city of cities) {
    const p = surfacePoint(city.lat, city.lon, 0, 0, 1);
    close((Math.asin(p[1]) * 180) / Math.PI, city.lat);
    close((Math.atan2(-p[2], p[0]) * 180) / Math.PI, city.lon);
    const rotated = surfacePoint(city.lat, city.lon, Math.PI / 2, 0, 1);
    const expected = surfacePoint(city.lat, city.lon + 90, 0, 0, 1);
    rotated.forEach((v, i) => close(v, expected[i]));
  }
});
test("self rotation changes day/night at the same city; fixed axis gives opposite seasonal illumination", () => {
  const ep = earthPosition(0);
  const city = cities[0],
    p = surfacePoint(city.lat, city.lon),
    night = surfacePoint(city.lat, city.lon, Math.PI);
  assert.ok(daylight(p, ep) > 0);
  assert.ok(daylight(night, ep) < 0);
  const north = surfacePoint(90, 0, 0, TILT, 1);
  assert.ok(daylight(north, earthPosition(YEAR / 4)) > 0);
  assert.ok(daylight(north, earthPosition((YEAR * 3) / 4)) < 0);
  close(daylight(north, earthPosition(0)), 0);
  for (const d of [0, 91, 180, 273, YEAR])
    close(Math.hypot(...earthPosition(d)), 8);
});
test("question routing selects the relevant scene without changing persisted question content", () => {
  assert.equal(solarFocus("equator"), "coordinates");
  assert.equal(solarFocus("longitude"), "coordinates");
  assert.equal(solarFocus("orbit"), "orbit");
  assert.equal(solarFocus("night"), "spin");
  const q = { id: "geography-w1-d1-q6", subject: "geography", visual: "globe" };
  const copy = structuredClone(q);
  assert.equal(supportsSolarDemo(q), true);
  assert.deepEqual(q, copy);
  assert.equal(
    supportsSolarDemo({ subject: "biology", visual: "globe" }),
    false,
  );
  assert.equal(
    supportsSolarDemo({ subject: "geography", visual: "map" }),
    false,
  );
});
